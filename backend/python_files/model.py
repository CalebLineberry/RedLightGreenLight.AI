from transformers import PretrainedConfig
from transformers import PreTrainedModel, AutoModel
from transformers import AutoModel
from peft import LoraConfig, get_peft_model
import torch
import torch.nn as nn
import torch._dynamo
from transformers.modeling_outputs import ModelOutput
from dataclasses import dataclass
from typing import Optional
from peft import LoraConfig, get_peft_model

@dataclass
class LSTMTOutput(ModelOutput):
    logits: torch.FloatTensor = None
    hidden_state: Optional[torch.FloatTensor] = None

class LSTMTConfig(PretrainedConfig):
    model_type = "lstm_t_bert"

    def __init__(self, bert_base_model="answerdotai/ModernBERT-base", context_window_size=None, lora=False, lora_rank=None, lora_target_modules=None, **kwargs):
      super().__init__(**kwargs)

      self.bert_base_model = bert_base_model
      self.context_window_size = context_window_size
      self.lora = lora
      self.lora_rank = lora_rank
      self.lora_target_modules = lora_target_modules or []
    

class LSTM_T(PreTrainedModel):
  config_class = LSTMTConfig
  base_model_prefix = "lstm_t"

  def __init__(self , config):
    super().__init__(config)


    bertBaseModel = config.bert_base_model
    contextWindowSize = config.context_window_size
    LoRA = config.lora
    LoRARank = config.lora_rank
    LoRATargetModules = config.lora_target_modules

    #get the bert tokenizer and model
    self.bert = None
    if "answerdotai/ModernBERT" in bertBaseModel:
      self.bert = AutoModel.from_pretrained(bertBaseModel, attn_implementation="sdpa", dtype=torch.float16)
    else:
      self.bert = AutoModel.from_pretrained(bertBaseModel, dtype=torch.float16)
    self.d = self.bert.config.hidden_size #model dim

    #freeze bert model weights
    for w in self.bert.parameters():
        w.requires_grad = False

    #set up for lora
    if LoRA:
      lora_config = LoraConfig(
        init_lora_weights="olora",
        r=LoRARank,
        lora_alpha=32,
        target_modules=LoRATargetModules,
        lora_dropout=0.05,
        bias="none",
      )

      self.bert = get_peft_model(self.bert, lora_config)
      for name, param in self.bert.named_parameters():
        if "lora_" in name:
            param.data = param.data.to(torch.float16)

    #context window
    if not contextWindowSize:
      self.l = self.bert.config.max_position_embeddings
    else:
      if contextWindowSize > self.bert.config.max_position_embeddings:
        raise Exception("context window is too large")
      self.l = contextWindowSize

    #define LSTM weights
    #Forget Gate
    self.forgetWeights = nn.Parameter(nn.init.xavier_uniform_(torch.empty(self.d,self.d,dtype=torch.float16)))
    self.forgetBias = nn.Parameter(torch.ones(self.d,1,dtype=torch.float16))
    self.forgetTransform = nn.Parameter(nn.init.xavier_uniform_(torch.empty(self.l,1,dtype=torch.float16)))
    #Input Gate
    self.longKeepWeights = nn.Parameter(nn.init.xavier_uniform_(torch.empty(self.d,self.d,dtype=torch.float16)))
    self.longKeepBias = nn.Parameter(torch.zeros(self.d,1,dtype=torch.float16))
    self.longPotentialWeights = nn.Parameter(nn.init.xavier_uniform_(torch.empty(self.d,self.d,dtype=torch.float16)))
    self.longPotentialBias = nn.Parameter(torch.zeros(self.d,1,dtype=torch.float16))
    self.inputTransform = nn.Parameter(nn.init.xavier_uniform_(torch.empty(self.l,1,dtype=torch.float16)))
    #Output Gate
    self.shortKeepWeights = nn.Parameter(nn.init.xavier_uniform_(torch.empty(self.d,self.d,dtype=torch.float16)))
    self.shortKeepBias = nn.Parameter(torch.zeros(self.d,1,dtype=torch.float16))
    self.shortPotentialWeights = nn.Parameter(nn.init.xavier_uniform_(torch.empty(self.d,self.d,dtype=torch.float16)))
    self.shortPotentialBias = nn.Parameter(torch.zeros(self.d,1,dtype=torch.float16))
    self.outputTransform = nn.Parameter(nn.init.xavier_uniform_(torch.empty(self.l,1,dtype=torch.float16)))
    #Layer Norm
    self.cLn = nn.LayerNorm(self.d,elementwise_affine=True,dtype=torch.float16)
    self.hLn = nn.LayerNorm(self.d,elementwise_affine=True,dtype=torch.float16)

    self.grelu = nn.GELU()
    self.hardtan = nn.Hardtanh(min_val=-8.0, max_val=8.0)

    self.post_init()

  @torch._dynamo.disable
  def forward(self,input_ids = None, attention_mask = None, document_mask = None, labels =  None, **kwargs):
    # Get device
    device = next(self.parameters()).device

    # Get out shape
    b,d,l = input_ids.shape

    # Get out all the info and reshape
    ids = input_ids.reshape(b*d,l)
    attnMasks = attention_mask.reshape(b*d,l)
    masks = document_mask.to(torch.bool)

    # Move it over to the right device
    ids = ids.to(device)
    attnMasks = attnMasks.to(device)
    masks = masks.to(device)

    # Make argument to transformer and reshape the tensor
    argument = {"input_ids":ids,"attention_mask":attnMasks}
    trans = self.bert(**argument).last_hidden_state
    trans = trans.view(b, d, l, trans.size(-1))

    docFlat = trans.view(-1, l, trans.size(-1)).permute(0, 2, 1)

    projForget = docFlat @ self.forgetTransform
    projInput  = docFlat @ self.inputTransform
    projOutput = docFlat @ self.outputTransform

    # Reshape back to [batch, seq_len, hidden, 1]
    projForget = projForget.view(b, d, -1, 1)
    projInput  = projInput.view(b, d, -1, 1)
    projOutput = projOutput.view(b, d, -1, 1)

    # Hidden state and cell state
    cellState = torch.zeros(trans.size(0),self.d,1,requires_grad = False,device=device,dtype=torch.float16)
    hiddenState = torch.zeros(trans.size(0),self.d,1,requires_grad = False,device=device,dtype=torch.float16)

    # Itterate over the sequence
    for t in range(d):
      prevH = hiddenState
      prevC = cellState

      normCState = self.cLn(cellState.squeeze(-1)).unsqueeze(-1)
      normHState = self.hLn(hiddenState.squeeze(-1)).unsqueeze(-1)

      # Forget Gate
      fGate = torch.sigmoid(self.hardtan(self.forgetWeights @ normHState + self.forgetBias) + projForget[:, t])
      cellState = cellState * fGate

      # Input Gate
      iGate = torch.sigmoid(self.hardtan(self.longKeepWeights @ normHState + self.longKeepBias) + projInput[:, t])
      gGate = self.hardtan(self.grelu(self.longPotentialWeights @ normHState + self.longPotentialBias) + projInput[:, t])
      cellState = cellState + (iGate * gGate)

      # Output Gate
      oGate = torch.sigmoid(self.hardtan(self.shortKeepWeights @ normHState + self.shortKeepBias) + projOutput[:, t])
      hiddenState = oGate * self.hardtan(self.grelu(self.shortPotentialWeights @ normCState + self.shortPotentialBias))

      # Apply mask
      m = masks[:, t].view(b, 1, 1)
      hiddenState = torch.where(m, hiddenState, prevH)
      cellState = torch.where(m, cellState, prevC)
      cellState = torch.clamp(cellState, min=-10, max=10)
      hiddenState = torch.clamp(hiddenState, min=-10, max=10)

    return LSTMTOutput(logits=None,hidden_state=hiddenState)

class FullModel(PreTrainedModel):
  config_class = LSTMTConfig
  base_model_prefix = "lstm_t"

  def __init__(self , config):

    #super and load in LSTM_T unit
    super().__init__(config)
    self.lstmT = LSTM_T(config)
    self.contextWindowSize = self.lstmT.l
    d = self.lstmT.d

    #feed forward network
    self.layer1 = nn.Linear(in_features=self.lstmT.d , out_features=self.lstmT.d // 8,dtype=torch.float16)
    self.layer2 = nn.Linear(in_features=self.lstmT.d // 8, out_features=self.lstmT.d // 16,dtype=torch.float16)
    self.layer3 = nn.Linear(in_features=self.lstmT.d // 16, out_features=self.lstmT.d // 32,dtype=torch.float16)
    self.layer4 = nn.Linear(in_features=self.lstmT.d // 32, out_features=1,dtype=torch.float16)
    self.actFunc = nn.LeakyReLU(0.1)
    self.dropout = nn.Dropout(p=0.3)

    self.post_init()

  @torch._dynamo.disable
  def forward(self,input_ids = None, attention_mask = None, document_mask = None, labels =  None, **kwargs):
    output = self.lstmT(input_ids = input_ids , attention_mask = attention_mask , document_mask = document_mask,labels=None).hidden_state
    output = output.squeeze(-1)

    output = self.layer1(output)
    output = self.actFunc(output)
    output = self.dropout(output)

    output = self.layer2(output)
    output = self.actFunc(output)
    output = self.dropout(output)

    output = self.layer3(output)
    output = self.actFunc(output)
    output = self.dropout(output)

    output = self.layer4(output)

    return LSTMTOutput(logits=output,hidden_state=None)
