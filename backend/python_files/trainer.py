from torchmetrics.classification import BinaryF1Score
from torch.utils.data import Dataset,DataLoader,random_split
from pathlib import Path
from tqdm import tqdm
import torch
import torch.nn as nn

def train_model(model = None, optimizer = None, trainingData = None,savePath = None, epochs = 100, batch_size = 32,validation_percent = 0.15, waitTime = 5):
  assert (model is not None and optimizer is not None and trainingData is not None and savePath is not None)

  bestValF1 = -1
  bestValLoss = 99999
  bestTrainF1 = -1
  bestTrainLoss = 99999
  wait = waitTime
  f1_calculator = BinaryF1Score()
  loss_calculator = nn.BCEWithLogitsLoss()
  device = device = next(model.parameters()).device
  results = {"valLoss":[],"valF1":[],"trainLoss":[],"trainF1":[],"trainingBatchLosses":[]}
  sig = nn.Sigmoid()
  scaler = torch.amp.GradScaler('cuda')

  if not os.path.isdir(savePath) or os.listdir(savePath):
    raise Exception("Must have an empty pre-existing directory for the results to be saved to")

  if savePath[-1] != "/":
    savePath += "/"

  valLen = int(len(trainingData) * validation_percent)
  trainLen = len(trainingData) - valLen
  train , val = random_split(trainingData , [trainLen,valLen])
  trainLoader = DataLoader(train , batch_size = batch_size)
  valLoader = DataLoader(val , batch_size = batch_size)

  for epoch in range(epochs):

    if wait <= 0:
      break

    #training
    model.train()
    accumSteps = 8
    cummulativeLoss = 0
    cummulativeF1 = 0
    n = 0
    step = 0
    for x,y in tqdm(iter(trainLoader)):
      y_hat = model(x)
      y = y.to(torch.float32)
      y_hat = y_hat.to(torch.float32)

      loss = loss_calculator(y_hat.squeeze(-1) , y.to(device))
      loss = torch.clamp(loss, min=0.0, max=2.0)
      loss = loss / accumSteps

      if (step + 1) % accumSteps == 0:
        scaler.scale(loss).backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        scaler.step(optimizer)
        scaler.update()
        optimizer.zero_grad(set_to_none=True)

      y_hat = y_hat.squeeze(-1).detach().to("cpu")
      y = y.detach().to("cpu")
      loss = loss.detach().item()
      f1 = f1_calculator(sig(y_hat),y).item()
      n += len(x)

      cummulativeLoss += loss * len(x)
      cummulativeF1 += f1 * len(x)

      results['trainingBatchLosses'].append(loss)
      step += 1

    loss = cummulativeLoss / n
    printloss = loss
    f1 = cummulativeF1 / n

    if loss < bestTrainLoss:
      bestTrainLoss = loss
      torch.save(model.state_dict(),savePath + 'trainLossModel.pth')

    if f1 > bestTrainF1:
      bestValF1 = f1
      torch.save(model.state_dict(),savePath + 'trainF1Model.pth')

    results["trainF1"].append(f1)
    results["trainLoss"].append(loss)


    #validation
    model.eval()
    cummulativeLoss = 0
    cummulativeF1 = 0
    n = 0
    for x,y in tqdm(iter(valLoader)):
      with torch.no_grad():
        y_hat = model(x)
        y_hat = y_hat.to(torch.float32)
        y = y.to(torch.float32)
        loss = loss_calculator(y_hat.squeeze(-1) , y.to(device))
        y_hat = y_hat.squeeze(-1).to("cpu")
        y = y.to("cpu")
        loss = loss.item()

        f1 = f1_calculator(sig(y_hat),y).item()
        n += len(x)

        cummulativeLoss += loss * len(x)
        cummulativeF1 += f1 * len(x)

    loss = cummulativeLoss/n
    f1 = cummulativeF1 / n

    if loss < bestValLoss:
      bestValLoss = loss
      torch.save(model.state_dict(),savePath + 'valLossModel.pth')
      wait = waitTime + 1

    if f1 > bestValF1:
      bestValF1 = f1
      torch.save(model.state_dict(),savePath + 'valF1Model.pth')
      wait = waitTime + 1

    results["valF1"].append(f1)
    results["valLoss"].append(loss)

    if os.path.isfile(savePath + "/results.json"):
      os.remove(savePath + "/results.json")

    with open(savePath + "/results.json", "w+", encoding="utf-8") as f:
      json.dump(results,f)

    wait -= 1
    print(f"Done with epoch {epoch} loss was {printloss}.")

  torch.save(model.state_dict(),savePath + 'finalEpoch.pth')