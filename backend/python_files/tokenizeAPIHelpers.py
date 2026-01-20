from huggingface_hub import hf_hub_download,upload_folder
from huggingface_hub import snapshot_download
from huggingface_hub import HfApi
from huggingface_hub import login
from huggingface_hub import HfApi
import os
from pathlib import Path
import torch
from tokenizer import LSTMT_Tokenizer
import shutil

class datasetHandler():

  def __init__(self,hf_token,local_data_dir):
    login(hf_token)
    self.api = HfApi(token = hf_token)
    self.local_data_dir = local_data_dir

  def list_tickers(self):
    all_files = self.api.list_repo_files(repo_id="UMWRoom225/TokenizedSECDocs", repo_type="dataset")
    tickers = []
    for f in all_files:
      if "/" in f:
        prefix = f[:f.index("/")]
        if prefix not in tickers:
          tickers.append(prefix)
    return tickers

  def upload_ticker(self,path,ticker_name):
    try:
      upload_folder(folder_path=path,path_in_repo=ticker_name, repo_id="UMWRoom225/TokenizedSECDocs", repo_type="dataset")
      return 1
    except:
      return 0

  def download_ticker(self,ticker):
    try:
      path = snapshot_download(
        repo_id="UMWRoom225/TokenizedSECDocs",
        repo_type="dataset",
        allow_patterns=f"{ticker}/*",
        local_dir=self.local_data_dir
      )
      return path
    except:
      return 0

  def delete_ticker(self,ticker):
    self.api.delete_folder(
      repo_id="UMWRoom225/TokenizedSECDocs",
      path_in_repo=f"{ticker}",
      repo_type="dataset",
      commit_message=f"Deleted {ticker}"
    )

def concat_with_pad(a,b,max_docs,start_padding_a,start_padding_b):
  a = a[:start_padding_a]
  b = b[:start_padding_b]
  tmp = torch.concat((a,b))
  if len(tmp) >= max_docs:
    tmp = tmp[len(tmp) - max_docs : ]
  else:
    #document_mask
    if len(a.shape) == 1:
      tmp = torch.concat((tmp , torch.zeros(max_docs-len(tmp))))
    elif len(a.shape) == 2:
      tmp = torch.concat((tmp , torch.zeros(max_docs - len(tmp) , a.shape[1])))
    else:
      raise Exception("Bad tensors only works with arrs and mats")
  return tmp

def tokenizeDir(from_path , tmp_dir, max_docs = 300):
  if tmp_dir[-1] != "/":
    tmp_dir[-1] = "/"

  token = os.getenv("HF_TOKEN")

  tokenizer = LSTMT_Tokenizer(context_size = 1500)
  handler = datasetHandler(token , tmp_dir+"data")

  dir = Path(from_path)
  for path in dir.iterdir():
    if os.path.isfile(path) and "_docs.txt" in path.name:
      tickerName = path.name[0:path.name.index("_")]
      txt = None
      with open(str(path) , "r") as f:
        txt = f.read()
      txt = tokenizer(txt,max_docs = max_docs)

      if not os.path.isdir(tmp_dir):
        os.mkdir(tmp_dir)

      save_path = tmp_dir + tickerName + "/"
      if not os.path.isdir(save_path):
        os.mkdir(tmp_dir + tickerName)

      if tickerName not in handler.list_tickers():
        torch.save(txt["input_ids"],save_path + f"/input_ids.pt")
        torch.save(txt["attention_mask"],save_path + f"/attention_mask.pt")
        torch.save(txt["document_mask"],save_path + f"/document_mask.pt")
        del txt

      else:
        path = handler.download_ticker(tickerName)

        #get paddings
        prior_doc_mask = torch.load(path + f"/{tickerName}/document_mask.pt")
        prior_start_padding = None
        current_start_padding = None
        try:
          prior_start_padding = (prior_doc_mask == 0).nonzero(as_tuple=True)[0][0].item()
        except:
          prior_start_padding = len(prior_doc_mask) - 1
        try:
          current_start_padding = (txt["document_mask"] == 0).nonzero(as_tuple=True)[0][0].item()
        except:
          current_start_padding = len(txt["document_mask"]) - 1

        #document_mask
        txt["document_mask"] = concat_with_pad(prior_doc_mask,txt["document_mask"],max_docs,prior_start_padding,current_start_padding)
        torch.save(txt["document_mask"],save_path + f"/document_mask.pt")
        del txt["document_mask"]

        #input_ids
        prior_input_ids = torch.load(path + f"/{tickerName}/input_ids.pt")
        txt["input_ids"] = concat_with_pad(prior_input_ids,txt["input_ids"],max_docs,prior_start_padding,current_start_padding)
        torch.save(txt["input_ids"],save_path + f"/input_ids.pt")
        del txt["input_ids"]

        #attention_mask
        prior_input_ids = torch.load(path + f"/{tickerName}/attention_mask.pt")
        txt["attention_mask"] = concat_with_pad(prior_input_ids,txt["attention_mask"],max_docs,prior_start_padding,current_start_padding)
        torch.save(txt["attention_mask"],save_path + f"/attention_mask.pt")
        del txt["attention_mask"]

        shutil.rmtree(path + f"/{tickerName}/")
      handler.upload_ticker(save_path,tickerName)
      shutil.rmtree(save_path)
  shutil.rmtree(tmp_dir)
