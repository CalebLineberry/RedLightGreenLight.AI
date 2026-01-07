import pandas as pd
import os
import numpy as np
import yfinance as yf
import logging
import warnings
from torch.utils.data import Dataset,DataLoader,random_split
from pathlib import Path
from transformers import AutoModel
import re
from tqdm import tqdm
from transformers import AutoModel
from torch.utils.data import Subset
import torch
import torch.nn as nn
import logging
import warnings

warnings.filterwarnings("ignore", module="yfinance")
logging.getLogger("yfinance.utils").setLevel(logging.CRITICAL)
logging.getLogger("yfinance.base").setLevel(logging.CRITICAL)

def first_business_day(year):
    return pd.Timestamp(year=year, month=1, day=1) + pd.offsets.BDay(0)

def tokenize_data(dirPath,saveDirPath,tokenizer,max_length,overwrite=False,skip = [],tokenize_batch_size = 16):
  dir = Path(dirPath)
  numFiles = sum(1 for f in dir.rglob("*") if f.is_file())
  tickers = []

  #make the new directory for savedata
  try:
    os.mkdir(saveDirPath)
  except FileExistsError:
    if not overwrite:
      print(f"Directory '{saveDirPath}' already exists.")
      return
    if overwrite:
      pass

  #get all tickers and documents from the directory
  with tqdm(total = numFiles) as pbar:
    for path in dir.iterdir():

      #get out ticker and document type
      ticker = str(path.name)[0:str(path.name).index("_")]
      docType = str(path.name)[str(path.name).index("_") + 1 : str(path.name).index(".")]

      if ticker not in tickers:
        tickers.append(ticker)

      if ticker in skip:
        pbar.update(1)
        continue

      #make the directory for the tokenized data
      try:
        os.mkdir(saveDirPath + f"{ticker}")
      except FileExistsError:
        if not overwrite:
          print(f"Directory '{saveDirPath}' already exists.")
          return
        if overwrite:
          pass

      #deal with the doc docType
      if docType == "docs":
        with open(path.resolve()) as f:
          txt = f.read()
          docs = re.split(r"\n\[EOD\]\n" , txt)
          docs.pop()
          pos = 0
          loader = DataLoader(docs , batch_size = tokenize_batch_size)
          for ds in iter(loader):
            result = tokenizer(ds,return_tensors = "pt",padding = "max_length",max_length=max_length,truncation=True)
            input_ids = result.data["input_ids"]
            attn_mask = result.data["attention_mask"]
            for j in range(len(input_ids)):
              torch.save(input_ids[j],saveDirPath + f"{ticker}/input_ids{pos}.pt")
              torch.save(attn_mask[j],saveDirPath + f"{ticker}/attention_mask{pos}.pt")
              pos += 1

      #deal with the dates docType
      if docType == "dates":
        with open(path.resolve()) as f:
          txt = f.read()
          ds = txt.split("\n")
          ds.pop()
          ds = np.array(ds)
          np.save(saveDirPath + f"{ticker}/dates.npy",ds)
          del ds
          yrs = re.findall(r"\d\d\d\d",txt)
          unq = pd.Series(yrs).unique()
          unq = np.sort(unq.astype(int))
          unq = np.array(unq)
          np.save(saveDirPath + f"{ticker}/years.npy",unq)
          del unq
      pbar.update(1)

      np.save(saveDirPath + f"tokenizedTickers.npy" , np.array(tickers))

  return tickers

def get_targets(dirPath,targetRefStock = "SPY",valid = []):
  dir = Path(dirPath)
  numDirs = sum(1 for f in dir.iterdir() if f.is_dir())
  tickers = []

  with tqdm(total = numDirs) as pbar:
    for path in dir.iterdir():

      tick = str(path.name)

      #skip over hidden dirs and files
      if "." in str(path):
        pbar.update(1)
        continue

      if tick not in valid:
        pbar.update(1)
        continue

      years = np.load(str(path) + "/years.npy")

      if tick not in tickers:
        tickers.append(tick)

      target = np.zeros(len(years))
      for i in range(len(years)):
        year = years[i]
        #start and end days for the year
        startDay = str(first_business_day(year))[0:10]
        endDay = str(first_business_day(year + 1))[0:10]

        #return over the year for the curStock
        returnPercentCur = None
        try:
          ticker = yf.Ticker(tick)
          history = ticker.history(start=startDay,end=endDay,auto_adjust=True,) #get history auto adjusted for splits and what not
          openPrice = history.iloc[0]["Open"]
          closePrice = history.iloc[-1]["Close"]
          returnPercentCur = (closePrice-openPrice)/openPrice
        except Exception as e:
          target[i] -= 1
          continue

        #return over the year for the targetRefrenceStock
        returnPercentTarget = 0 #defaults to just being positive if the refrence pos doesnt exist for that year
        try:
          ticker = yf.Ticker(targetRefStock)
          history = ticker.history(start=startDay,end=endDay,auto_adjust=True) #get history auto adjusted for splits and what not
          openPrice = history.iloc[0]["Open"]
          closePrice = history.iloc[-1]["Close"]
          returnPercentTarget = (closePrice-openPrice)/openPrice
        except:
          pass

        #if cur > target 1 else 0
        if returnPercentCur > returnPercentTarget:
          target[i] += 1

      #update the targets
      target = target.astype(int)
      np.save(str(path) + "/targets.npy",target)
      pbar.update(1)

      np.save(dirPath + f"targetedTickers.npy" , np.array(tickers))

  return tickers

def get_max_seq_len(dirPath,valid = []):
  dir = Path(dirPath)
  numDirs = sum(1 for f in dir.iterdir() if f.is_dir())

  max_seq_len = 0

  with tqdm(total = numDirs) as pbar:
    for path in dir.iterdir():

      #skip over hidden dirs
      if "." in str(path):
        pbar.update(1)
        continue

      if str(path.name) not in valid:
        pbar.update(1)
        continue

      dates = np.load(str(path) + "/dates.npy")

      if len(dates) > max_seq_len:
        max_seq_len = len(dates)

      pbar.update(1)

  return max_seq_len

def arrange_data(dirPath,max_seq_len,max_cum_length = None,valid = []):
  dir = Path(dirPath)
  numDirs = sum(1 for f in dir.iterdir() if f.is_dir())
  tickers = []

  with tqdm(total = numDirs) as pbar:
      for path in dir.iterdir():
        y = []
        maxYears = []

        #skip over hidden dirs
        if "." in str(path):
          pbar.update(1)
          continue

        if str(path.name) not in valid:
          pbar.update(1)
          continue

        ticker = str(path.name)
        dts = pd.Series(np.load(str(path) + "/dates.npy"))
        unqYrs = pd.Series(np.load(str(path) + "/years.npy"))
        tgts = pd.Series(np.load(str(path) + "/targets.npy"))
        cumIdx = []

        pos = 0
        for i in range(len(unqYrs)):
          xID = []
          xAM = []
          t = tgts.iloc[i]
          yr = unqYrs.iloc[i]
          idxs = dts[dts.str.contains(str(yr))].index.values
          cumIdx.extend(idxs.tolist())

          if max_cum_length != None and len(cumIdx) > max_cum_length:
            cumIdx = cumIdx[(len(cumIdx) - max_cum_length) : ]

          if t != -1: #ignores faulty years
            y.append(t)
            maxYears.append(yr)

            for idx in cumIdx:
              xID.append(torch.load(str(path) + f"/input_ids{idx}.pt"))
              xAM.append(torch.load(str(path) + f"/attention_mask{idx}.pt"))

            #padding
            docMask = None
            if len(xID) < max_seq_len:
              padMask = torch.zeros(xAM[0].shape)
              padSeq = torch.zeros(xID[0].shape)

              adds = max_seq_len - len(xID)
              ogLen = len(xID)
              while (adds > 0):
                xID.append(padSeq.clone())
                xAM.append(padMask.clone())
                adds -= 1

              docMask = torch.cat([
                  torch.ones(ogLen),
                  torch.zeros(max_seq_len - ogLen)
              ])


            if len(xID) > max_seq_len:
              adjust = len(xID) - max_seq_len
              xID = xID[adjust : ]
              xAM = xAM[adjust : ]
              docMask = torch.ones(max_seq_len)

            if len(xID) == max_seq_len:
              docMask = torch.ones(max_seq_len)

            xID = torch.stack(xID)
            xAM = torch.stack(xAM)


            torch.save(xID,str(path) + f"/xID{pos}.pt")
            torch.save(xAM,str(path) + f"/xAM{pos}.pt")
            torch.save(docMask,str(path) + f"/docAM{pos}.pt")
            pos += 1

        np.save(str(path) + f"/targets.npy" , np.array(y))
        np.save(str(path) + f"/maxYears.npy" , np.array(maxYears))
        pbar.update(1)
    
def validate_before_targets(dirPath):
  dir = Path(dirPath)
  numDirs = sum(1 for f in dir.iterdir() if f.is_dir())
  valid = []
  invalid = []

  with tqdm(total = numDirs) as pbar:
    for path in dir.iterdir():

      if "." in str(path):
        pbar.update(1)
        continue

      ticker = str(path.name)
      try:
        torch.load(str(dir) + f"/{ticker}/attention_mask0.pt")
        torch.load(str(dir) + f"/{ticker}/input_ids0.pt")
        np.load(str(dir) + f"/{ticker}/dates.npy")
        np.load(str(dir) + f"/{ticker}/years.npy")
        valid.append(ticker)
      except:
        invalid.append(ticker)

      pbar.update(1)

  np.save(dirPath + f"validTickers.npy" , np.array(valid))
  np.save(dirPath + f"invalidTickers.npy" , np.array(valid))
  return valid

def cleanup(dirPath):
  dir = Path(dirPath)
  numDirs = sum(1 for f in dir.iterdir() if f.is_dir())
  valid = []
  invalid = []

  with tqdm(total = numDirs) as pbar:
    for path in dir.iterdir():
      if "." in str(path):
        pbar.update(1)
        continue

      subdir = Path(str(path) + '/')
      for f in subdir.iterdir():
        if "input_ids" in str(f.name) or "attention_mask" in str(f.name):
          os.remove(f)
      pbar.update(1)

def prep_it(fromPath,toPath,max_length,tokenizer,overwrite,max_cum_length,tokenize_batch_size=16,skip = [],max_seq_len=None):

  '''
  fromPath = "/content/drive/MyDrive/SEC-Company-Documents/testingData/"
  toPath = "/content/drive/MyDrive/SEC-Company-Documents/tokenizedTestingData/"
  max_length = 1000
  tokenizer = AutoTokenizer.from_pretrained("answerdotai/ModernBERT-base")
  overwrite = True
  max_cum_length = 500
  #fromPath,toPath,max_length,tokenizer,overwrite,max_cum_length,tokenize_batch_size=16,skip = []
  prep_it(fromPath,toPath,max_length,tokenizer,overwrite,max_cum_length,tokenize_batch_size=32,skip = [])
  '''

  tokenize_data(fromPath,toPath,tokenizer,max_length,overwrite=overwrite,tokenize_batch_size=tokenize_batch_size,skip=skip)
  validTickers = validate_before_targets(toPath)
  get_targets(toPath,valid = validTickers)
  if max_seq_len is None:
    max_seq_len = get_max_seq_len(toPath,valid = validTickers)
  arrange_data(toPath,max_seq_len,max_cum_length = max_cum_length,valid=validTickers)
  cleanup(toPath)

class DirDataset(Dataset):

  def __init__(self,dirPath,valid = []):
    self.dir = Path(dirPath)
    tickers = []
    start = []
    stop = []

    startPos = 0
    for path in self.dir.iterdir():

      #skip over hidden dirs and files
      if "." in str(path):
        continue

      if str(path.name) not in valid:
        continue

      length = len(np.load(str(path) + "/maxYears.npy")) #num samples
      tickers.append(str(path.name))
      start.append(startPos)
      stop.append((startPos + length))
      startPos += (length)

    #stop is non inclusive.
    self.posRef = []
    for ticker, s, e in zip(tickers, start, stop):
      self.posRef.extend([(ticker, i - s) for i in range(s, e)])

  def __getitem__(self,i):

    if i >= len(self):
      raise Exception(f"index {i} is out of bounds for length {len(self)}")

    ticker,indx = self.posRef[i]

    id = torch.load(str(self.dir) + f"/{ticker}/xID{indx}.pt").to(torch.int)
    am = torch.load(str(self.dir) + f"/{ticker}/xAM{indx}.pt").to(torch.float32)
    docAM = torch.load(str(self.dir) + f"/{ticker}/docAM{indx}.pt").to(torch.float32)
    target = torch.tensor(np.load(str(self.dir) + f"/{ticker}/targets.npy")).to(torch.int)

    x = {"input_ids":id,"attention_mask":am,"document_mask":docAM}
    return (x,target[indx])

  def __len__(self):
    return len(self.posRef)

  def getItemWithMaxYr(self,i):
    x,target = self[i]
    ticker,indx = self.posRef[i]
    yr = np.load(str(self.dir) + f"/{ticker}/maxYears.npy")[indx]
    return (x,target,yr)

  def getMaxYr(self,i):
    ticker,indx = self.posRef[i]
    yr = np.load(str(self.dir) + f"/{ticker}/maxYears.npy")[indx]
    return yr

  def getItemWithTicker(self,i):
    x,target = self[i]
    ticker,indx = self.posRef[i]
    return (x,target,ticker)

  def getTickYrTarget(self,i):
    ticker,indx = self.posRef[i]
    yr = np.load(str(self.dir) + f"/{ticker}/maxYears.npy")[indx]
    target = np.load(str(self.dir) + f"/{ticker}/targets.npy")[indx]
    return (ticker,yr,target)
  
def train_test_split(data, trainPercent = 0.8 , yearLimit = None):

  if yearLimit is None:
    lenTrain = int(len(data) * trainPercent)
    lenTest = int(len(data) - lenTrain)
    trainData , testData = random_split(data , [lenTrain , lenTest])
    return(trainData,testData)

  else:
    trainIndx = []
    testIndx = []
    for i in range(len(data)):
      yr = data.getMaxYr(i)
      if yr >= yearLimit:
        testIndx.append(i)
      else:
        trainIndx.append(i)

    testData = Subset(data,testIndx)
    trainData = Subset(data,trainIndx)
    return (trainData,testData)

def get_params():
  model = AutoModel.from_pretrained("answerdotai/ModernBERT-base",attn_implementation="sdpa", dtype=torch.bfloat16)
  params = []
  for name, module in model.named_modules():
      if isinstance(module, nn.Linear):
          if "Wqkv" in name:
            params.append(name)
  params = params[18:]
  return params