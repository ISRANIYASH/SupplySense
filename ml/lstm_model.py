import torch
import torch.nn as nn
import numpy as np

class DemandLSTM(nn.Module):
    def __init__(self, input_size, hidden_size1=256, hidden_size2=128, hidden_size3=64):
        super(DemandLSTM, self).__init__()
        
        self.lstm1 = nn.LSTM(input_size=input_size, hidden_size=hidden_size1, num_layers=1, batch_first=True)
        self.dropout1 = nn.Dropout(0.2)
        
        self.lstm2 = nn.LSTM(input_size=hidden_size1, hidden_size=hidden_size2, num_layers=1, batch_first=True)
        self.dropout2 = nn.Dropout(0.2)
        
        self.lstm3 = nn.LSTM(input_size=hidden_size2, hidden_size=hidden_size3, num_layers=1, batch_first=True)
        
        self.linear = nn.Linear(hidden_size3, 1)
        
    def forward(self, x):
        out, _ = self.lstm1(x)
        out = self.dropout1(out)
        
        out, _ = self.lstm2(out)
        out = self.dropout2(out)
        
        out, _ = self.lstm3(out)
        
        # Take the last timestep output only
        out = out[:, -1, :]
        out = self.linear(out)
        return out.squeeze()


def train_epoch(model, loader, criterion, optimizer, device):
    model.train()
    total_loss = 0
    for X, y in loader:
        X, y = X.to(device), y.to(device)
        optimizer.zero_grad()
        outputs = model(X)
        loss = criterion(outputs, y)
        loss.backward()
        # Gradient clipping to prevent exploding gradients
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()
        total_loss += loss.item()
    return total_loss / len(loader)


def evaluate(model, loader, criterion, device, target_scaler=None):
    """
    Evaluate the model. If target_scaler is provided, inverse-transforms
    predictions and targets before computing MAE, RMSE, MAPE so that
    metrics are in original (real-world) units.
    """
    model.eval()
    total_loss = 0
    all_preds = []
    all_targets = []

    with torch.no_grad():
        for X, y in loader:
            X, y = X.to(device), y.to(device)
            outputs = model(X)
            loss = criterion(outputs, y)
            total_loss += loss.item()
            all_preds.extend(outputs.cpu().numpy())
            all_targets.extend(y.cpu().numpy())

    all_preds   = np.array(all_preds,   dtype=np.float32)
    all_targets = np.array(all_targets, dtype=np.float32)

    scaled_mse = total_loss / len(loader)

    # Inverse-transform if scaler provided
    if target_scaler is not None:
        all_preds   = target_scaler.inverse_transform(all_preds.reshape(-1, 1)).flatten()
        all_targets = target_scaler.inverse_transform(all_targets.reshape(-1, 1)).flatten()

    mae  = float(np.mean(np.abs(all_preds - all_targets)))
    rmse = float(np.sqrt(np.mean((all_preds - all_targets) ** 2)))

    # MAPE – guard against zero targets
    mask = all_targets > 0
    if mask.sum() > 0:
        mape = float(np.mean(np.abs((all_targets[mask] - all_preds[mask]) / all_targets[mask])) * 100)
    else:
        mape = 0.0

    return scaled_mse, mae, rmse, mape, all_preds, all_targets


class EarlyStopping:
    def __init__(self, patience=10, min_delta=0):
        self.patience  = patience
        self.min_delta = min_delta
        self.counter   = 0
        self.best_loss = None
        self.early_stop = False

    def __call__(self, val_loss):
        if self.best_loss is None:
            self.best_loss = val_loss
        elif val_loss > self.best_loss - self.min_delta:
            self.counter += 1
            if self.counter >= self.patience:
                self.early_stop = True
        else:
            self.best_loss = val_loss
            self.counter   = 0
