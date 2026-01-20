from torch.utils.data import DataLoader
from tqdm import tqdm
import torch


def test_model(model,testingData,batch_size,file_path = None):
  loader = DataLoader(testingData,batch_size = batch_size)

  targets = torch.tensor([])
  predictions = torch.tensor([])
  for x,y in tqdm(iter(loader)):
    with torch.no_grad():
      y_hat = model(**x).logits
      y_hat = y_hat.detach().to("cpu")
      predictions = torch.concatenate((predictions,y_hat),dim = 0)
      targets = torch.concatenate((targets,y),dim = 0)

  if file_path == None:
    return predictions,targets
  else:
    torch.save(predictions, file_path + "predictions.pt")
    torch.save(targets, file_path + "targets.pt")
    return predictions,targets

def binary_metrics(predictions , targets, threshold = 0.5):
  probs = torch.sigmoid(predictions)
  preds = (probs >= threshold).int()
  targets = targets.int()

  TP = 0
  TN = 0
  FP = 0
  FN = 0

  for i in range(len(targets)):
    guess = preds[i]
    actual = targets[i]

    if guess == 0 and actual == 0:
      TN += 1
    elif guess == 1 and actual == 1:
      TP += 1
    elif guess == 0 and actual == 1:
      FN += 1
    else:
      FP += 1

  acc  = (TP + TN) / (TP + TN + FP + FN)
  prec = TP / (TP + FP)
  rec  = TP / (TP + FN)
  f1   = 2 * prec * rec / (prec + rec)

  return acc, prec, rec, f1, TP, TN, FP,FN