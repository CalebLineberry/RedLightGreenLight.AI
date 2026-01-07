import os
from torchmetrics.classification import BinaryF1Score
import logging
import warnings
from torch.utils.data import DataLoader,random_split
from tqdm import tqdm
import torch
import torch.nn as nn
import logging
import warnings
import json
warnings.filterwarnings("ignore", module="yfinance")
logging.getLogger("yfinance.utils").setLevel(logging.CRITICAL)
logging.getLogger("yfinance.base").setLevel(logging.CRITICAL)

def train_model(model=None, optimizer=None, trainingData=None, savePath=None,epochs=15, batch_size=32, validation_percent=0.15, waitTime=5, accumSteps=8):
    assert model is not None and optimizer is not None and trainingData is not None and savePath is not None

    bestTrainLoss, bestTrainF1 = float('inf'), -1.0
    bestValLoss, bestValF1 = float('inf'), -1.0
    wait = waitTime
    f1_calculator = BinaryF1Score()
    loss_calculator = nn.BCEWithLogitsLoss()
    device = next(model.parameters()).device
    sig = nn.Sigmoid()

    results = {"valLoss": [], "valF1": [], "trainLoss": [], "trainF1": [], "trainingBatchLosses": []}
    scaler = torch.amp.GradScaler()

    os.makedirs(savePath, exist_ok=True)
    if os.listdir(savePath):
        raise Exception("Save directory must be empty")

    if savePath[-1] != "/":
        savePath += "/"

    valLen = int(len(trainingData) * validation_percent)
    trainLen = len(trainingData) - valLen
    train_dataset, val_dataset = random_split(trainingData, [trainLen, valLen])
    trainLoader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    valLoader = DataLoader(val_dataset, batch_size=batch_size)

    for epoch in range(epochs):
        if wait <= 0:
            print("Early stopping triggered.")
            break

        model.train()
        cumulativeLoss, n = 0.0, 0
        optimizer.zero_grad()

        all_preds = []
        all_labels = []

        for step, (x, y) in enumerate(tqdm(trainLoader, desc=f"Epoch {epoch+1}/{epochs} - Training")):

            y_hat = model(**x).logits.squeeze(-1)
            loss = loss_calculator(y_hat, y.to(device).float()) / accumSteps
            scaler.scale(loss).backward()

            if (step + 1) % accumSteps == 0 or (step + 1) == len(trainLoader):
                torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                scaler.step(optimizer)
                scaler.update()
                optimizer.zero_grad(set_to_none=True)

            y_hat = sig(y_hat.detach().cpu())

            all_preds.append(sig(y_hat))
            all_labels.append(y)
            cumulativeLoss += loss.item() * len(x) * accumSteps
            n += len(x)
            results['trainingBatchLosses'].append(loss.item() * accumSteps)

        train_loss = cumulativeLoss / n
        all_preds = torch.cat(all_preds)
        all_labels = torch.cat(all_labels)
        train_f1 = f1_calculator((all_preds > 0.5).float(), all_labels).item()

        if train_loss < bestTrainLoss:
          bestTrainLoss = train_loss
          path = savePath + "trainLossModel/"
          model.save_pretrained(path)

        if train_f1 > bestTrainF1:
          bestTrainF1 = train_f1
          path = savePath + "trainF1Model/"
          model.save_pretrained(path)

        results["trainLoss"].append(train_loss)
        results["trainF1"].append(train_f1)

        all_preds = []
        all_labels = []

        model.eval()
        cumulativeLoss, n = 0.0, 0
        with torch.no_grad():
            for x, y in tqdm(valLoader, desc=f"Epoch {epoch+1}/{epochs} - Validation"):
                y_hat = model(**x).logits.squeeze(-1)
                loss = loss_calculator(y_hat, y.to(device).float())
                y_hat = sig(y_hat.cpu())
                all_preds.append(y_hat)
                all_labels.append(y)
                cumulativeLoss += loss.item() * len(x)
                n += len(x)

        val_loss = cumulativeLoss / n
        all_preds = torch.cat(all_preds)
        all_labels = torch.cat(all_labels)
        val_f1 = f1_calculator((all_preds > 0.5).float(), all_labels).item()

        if val_loss < bestValLoss:
          bestValLoss = val_loss
          path = savePath + "valLossModel/"
          model.save_pretrained(path)
          wait = waitTime + 1

        if val_f1 > bestValF1:
          bestValF1 = val_f1
          path = savePath + "valF1Model/"
          model.save_pretrained(path)
          wait = waitTime + 1

        results["valLoss"].append(val_loss)
        results["valF1"].append(val_f1)

        with open(savePath + "results.json", "w+", encoding="utf-8") as f:
            json.dump(results, f)

        wait -= 1
        print(f"Epoch {epoch+1} done: Train Loss={train_loss:.4f}, Train F1={train_f1:.4f}, Val Loss={val_loss:.4f}, Val F1={val_f1:.4f}")

    model.save_pretrained(savePath +"finalEpochModel/")