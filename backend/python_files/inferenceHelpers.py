from huggingface_hub import snapshot_download
from huggingface_hub import upload_folder
from huggingface_hub import HfApi
from huggingface_hub import login
from torch.utils.data import Dataset,DataLoader
import torch
from pathlib import Path
import torch
import shutil

class InferenceHandler():

  def __init__(self,model,local_path,tickers,pre_load_size = 30 , batch_size = 3):
    if local_path[-1] != "/":
      local_path += "/"

    self.model = model
    self.tickers = tickers
    self.local_path = local_path
    self.pre_load_size = pre_load_size
    self.batchSize = batch_size
    self.dataset = DirDataset(local_path,tickers)
    self.curPos = 0
    self.results = {}
  
  def pre_load(self):
    for i in range(self.curPos , self.curPos + self.pre_load_size):
      try:
        self.dataset.pre_load(i)
      except Exception as e:
        print(e)
        pass
    self.curPos += self.pre_load_size

  def post_load(self):
    shutil.rmtree(self.local_path)

  def inference(self):
    self.model.eval()
    while self.curPos < len(self.tickers):
      self.pre_load()
      loader = DataLoader(self.dataset , batch_size = self.batchSize)
      for x,ts in iter(loader):
        with torch.no_grad():
          prediction = torch.sigmoid(self.model(**x).logits.squeeze(-1))
        for j in range(len(ts)):
          self.results[ts[j]] = prediction[j]
      self.post_load()
    
    return self.results

class DirDataset(Dataset):

  def __init__(self,local_path,tickers):
    if local_path[-1] != "/":
      local_path += "/"

    token = os.getenv("HF_TOKEN")
    self.handler = datasetHandler(token , local_path)
    self.dir = Path(local_path)
    self.local_path = local_path
    self.tickers = tickers

  def __getitem__(self,i):

    ticker = self.tickers[i]

    if i >= len(self):
      raise Exception(f"index {i} is out of bounds for length {len(self)}")

    id = torch.load(self.local_path + f"{ticker}/input_ids.pt").to(int)
    am = torch.load(self.local_path + f"{ticker}/attention_mask.pt").to(torch.float32)
    docAM = torch.load(self.local_path + f"{ticker}/document_mask.pt").to(torch.float32)

    x = {"input_ids":id,"attention_mask":am,"document_mask":docAM}
    return (x , ticker)
  
  def pre_load(self,i):
    if i >= len(self.tickers):
      raise Exception(f"index  {i} out of bounds")
    if self.tickers[i] not in self.handler.list_tickers():
      raise Exception(f"index {i} leads to ticker {self.tickers[i]} which is not in external storage")
    self.handler.download_ticker(self.tickers[i])
  
  def external_len(self):
    return len(self.handler.list_tickers())

  def __len__(self):
    return sum(1 for p in self.dir.iterdir() if p.is_dir() and "." not in p.name)

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
