import re
import torch
import json
from transformers import AutoTokenizer


class LSTMT_Tokenizer():

  def __init__(self , context_size=None , save_dir=None):
    if save_dir:
      self.baseTokenizer = AutoTokenizer.from_pretrained(save_dir)
      with open(f"{save_dir}/custom_config.json", "r") as f:
          config = json.load(f)
      self.context_window = config["context_window"]
    elif context_size:
      self.baseTokenizer = AutoTokenizer.from_pretrained("answerdotai/ModernBERT-base")
      self.context_window = context_size
    else:
      raise Exception("context_size and save_dir are both None. Complete one or the other kwarg to initialize.")

  def __call__(self,text,max_docs = 500):
    text = self.split_text(text,max_docs)
    text = self.tokenize_docs(text , self.context_window,max_docs)
    return text

  def split_text(self,text,max_docs):
    all_docs = []
    for txt in text:
      doc_list = re.split(r"\n\[EOD\]\n" , txt)
      if len(doc_list) > 0 and doc_list[-1].strip() == "":
        doc_list.pop()
      if len(doc_list) > max_docs:
        all_docs.append(doc_list[len(doc_list) - max_docs : ])
      else:
        all_docs.append(doc_list)
    return all_docs

  def tokenize_docs(self,docs,max_context_length,max_docs):
    input_ids = []
    attn_masks = []
    document_masks = []
    for doc_list in docs:
      result = self.baseTokenizer(doc_list,return_tensors = "pt",padding = "max_length",max_length=max_context_length,truncation=True)

      if len(doc_list) < max_docs:
        ids = result.data["input_ids"]
        attnMask = result.data["attention_mask"]
        padMask = torch.zeros((max_docs-len(doc_list),self.context_window))
        padSeq = torch.zeros((max_docs-len(doc_list),self.context_window))
        ids = torch.concat((ids,padSeq) , dim = 0)
        attnMask = torch.concat((attnMask,padMask) , dim = 0)

        docMask = torch.cat([
            torch.ones(len(doc_list)),
            torch.zeros(max_docs - len(doc_list))
        ])

        input_ids.append(ids)
        attn_masks.append(attnMask)
        document_masks.append(docMask)

      else:
        input_ids.append(result.data["input_ids"])
        attn_masks.append(result.data["attention_mask"])
        document_masks.append(torch.ones(len(doc_list)))

    input_ids = torch.stack(input_ids).to(torch.int)
    attn_masks = torch.stack(attn_masks).to(torch.float32)
    document_masks = torch.stack(document_masks).to(torch.float32)
    return {"input_ids":input_ids,"attention_mask":attn_masks,"document_mask":document_masks}

  def save(self, save_dir):

    self.baseTokenizer.save_pretrained(save_dir)
    config = {"context_window": self.context_window}
    with open(f"{save_dir}/custom_config.json", "w") as f:
        json.dump(config, f)