import os
from torchmetrics.classification import BinaryF1Score
from torch.utils.data import DataLoader,random_split
from tqdm import tqdm
import torch
import torch.nn as nn

def train_model(model = None , optimizer = None , trainingData = None , savePath = None , epochs = 15 , batch_size = 2 , validation_percent = 0.15 , waitTime = 3 , accumulation = 4):
  assert(model != None and optimizer != None and trainingData != None and savePath != None)

  device = next(model.parameters()).device

  if savePath[-1] != "/":
    savePath += "/"

  os.makedirs(savePath, exist_ok=True)
  if os.listdir(savePath):
    raise Exception("Save directory must be empty")

  validationSize = int(len(trainingData) * validation_percent)
  trainingSize = len(trainingData) - validationSize

  train,val = random_split(trainingData , [trainingSize , validationSize])
  trainLoader = DataLoader(train , batch_size = batch_size)
  valLoader = DataLoader(val , batch_size = batch_size)
  #pos_weight = torch.tensor(1.25)
  #metric = nn.BCEWithLogitsLoss(pos_weight=pos_weight)
  metric = nn.BCEWithLogitsLoss()
  f1_calculator = BinaryF1Score()

  results = {"valLoss": [], "valF1": [], "trainLoss": [], "trainF1": []}
  bestTrainLoss , bestTrainF1 = 9999 , 0.0
  bestValLoss , bestValF1 = 9999 , 0.0
  wait = waitTime

  for epoch in range(epochs):

    if wait <= 0:
      for w in optimizer.param_groups:
        w['lr'] = w['lr'] * 1.2

    n = 0
    cumLoss = 0
    mark = 0
    predictions = []
    targets = []
    model.train()
    for x,y in tqdm(iter(trainLoader)):
      y_hat = model(**x).logits.squeeze(-1)
      loss = metric(y_hat , y.to(device).float()) / accumulation
      if loss == None:
        raise Exception("Nan loss")
      loss.backward()

      y_hat = y_hat.detach().cpu()
      y = y.detach().cpu()
      loss = loss.detach().item()

      predictions.append(torch.sigmoid(y_hat))
      targets.append(y)
      cumLoss += loss * len(x)
      n += len(x)

      if (mark + 1) % accumulation == 0 or (mark + 1) == len(trainLoader):
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        mark = 0
        optimizer.step()
        optimizer.zero_grad(set_to_none=True)

      mark += 1

    predictions = torch.cat(predictions)
    targets = torch.cat(targets)

    cumLoss = cumLoss / n
    f1 = f1_calculator((predictions > 0.5).float(), targets).item()

    if cumLoss <= bestTrainLoss:
      bestTrainLoss = cumLoss
      path = savePath + "trainLossModel/"
      model.save_pretrained(path)

    if f1 >= bestTrainF1:
      bestTrainLoss = cumLoss
      path = savePath + "trainF1Model/"
      model.save_pretrained(path)

    results["trainLoss"].append(cumLoss)
    results["trainF1"].append(f1)

    print(f"Train Loss was {cumLoss} and Train F1 was {f1}.")

    n = 0
    cumLoss = 0
    predictions = []
    targets = []
    model.eval()
    for x,y in tqdm(iter(valLoader)):

      with torch.no_grad():
        y_hat = model(**x).logits.squeeze(-1)
        loss = metric(y_hat , y.to(device).float()) / accumulation
        y_hat = y_hat.detach().cpu()
        y = y.detach().cpu()
        loss = loss.detach().item()
        predictions.append(torch.sigmoid(y_hat))
        targets.append(y)
        cumLoss += loss * len(x)
        n += len(x)

    predictions = torch.cat(predictions)
    targets = torch.cat(targets)

    cumLoss = cumLoss / n
    f1 = f1_calculator((predictions > 0.5).float(), targets).item()

    if cumLoss <= bestValLoss:
      bestValLoss = cumLoss
      path = savePath + "valLossModel/"
      model.save_pretrained(path)
      wait = waitTime + 1

    if f1 >= bestValF1:
      bestValF1 = cumLoss
      path = savePath + "valF1Model/"
      model.save_pretrained(path)
      wait = waitTime + 1

    results["valLoss"].append(cumLoss)
    results["valF1"].append(f1)

    wait -= 1

    print(f"Val Loss was {cumLoss} and Val F1 was {f1}.")

  path = savePath + "finalEpochModel/"
  model.save_pretrained(path)