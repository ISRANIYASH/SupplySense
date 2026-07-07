"""
SupplySense — LSTM Demand Forecasting Model
Bidirectional LSTM with attention for demand forecasting.
"""
from __future__ import annotations

import logging
from typing import Optional

import mlflow
import mlflow.pytorch
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset

logger = logging.getLogger(__name__)


class DemandSequenceDataset(Dataset):
    """PyTorch Dataset for LSTM sequence-to-sequence demand forecasting."""

    def __init__(
        self,
        data: np.ndarray,
        seq_len: int = 60,
        pred_len: int = 30,
        feature_cols: list[int] | None = None,
        target_col: int = 0,
    ):
        self.data = data
        self.seq_len = seq_len
        self.pred_len = pred_len
        self.feature_cols = feature_cols or list(range(data.shape[1]))
        self.target_col = target_col

    def __len__(self) -> int:
        return max(0, len(self.data) - self.seq_len - self.pred_len + 1)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, torch.Tensor]:
        x = self.data[idx : idx + self.seq_len, self.feature_cols]
        y = self.data[idx + self.seq_len : idx + self.seq_len + self.pred_len, self.target_col]
        return torch.FloatTensor(x), torch.FloatTensor(y)


class AttentionLayer(nn.Module):
    """Bahdanau-style attention mechanism for LSTM output."""

    def __init__(self, hidden_size: int):
        super().__init__()
        self.attn = nn.Linear(hidden_size * 2, hidden_size)
        self.v = nn.Linear(hidden_size, 1, bias=False)

    def forward(
        self, encoder_outputs: torch.Tensor, hidden: torch.Tensor
    ) -> tuple[torch.Tensor, torch.Tensor]:
        # encoder_outputs: (batch, seq_len, hidden*2)
        # hidden: (batch, hidden)
        hidden_expanded = hidden.unsqueeze(1).expand_as(encoder_outputs)
        energy = torch.tanh(self.attn(torch.cat([hidden_expanded, encoder_outputs], dim=2)))
        attention_weights = torch.softmax(self.v(energy).squeeze(2), dim=1)
        context = torch.bmm(attention_weights.unsqueeze(1), encoder_outputs).squeeze(1)
        return context, attention_weights


class LSTMForecastNet(nn.Module):
    """
    Bidirectional LSTM with Attention for multi-step demand forecasting.
    
    Architecture:
        Input \u2192 BiLSTM Encoder \u2192 Attention \u2192 Decoder LSTM \u2192 FC \u2192 Output
    """

    def __init__(
        self,
        input_size: int,
        hidden_size: int = 256,
        num_layers: int = 3,
        pred_len: int = 30,
        dropout: float = 0.2,
    ):
        super().__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.pred_len = pred_len

        # Bidirectional encoder
        self.encoder = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=True,
            dropout=dropout if num_layers > 1 else 0.0,
        )

        # Attention
        self.attention = AttentionLayer(hidden_size)

        # Decoder (unidirectional)
        self.decoder = nn.LSTM(
            input_size=hidden_size * 2 + 1,  # context + last target value
            hidden_size=hidden_size,
            num_layers=1,
            batch_first=True,
        )

        # Output projection
        self.fc = nn.Sequential(
            nn.Linear(hidden_size, hidden_size // 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_size // 2, 1),
        )

        # Layer normalization
        self.layer_norm = nn.LayerNorm(hidden_size * 2)

    def forward(
        self,
        x: torch.Tensor,
        teacher_force_ratio: float = 0.5,
        target: Optional[torch.Tensor] = None,
    ) -> torch.Tensor:
        batch_size = x.size(0)

        # Encode
        encoder_outputs, (hidden, cell) = self.encoder(x)
        encoder_outputs = self.layer_norm(encoder_outputs)

        # Merge bidirectional hidden states
        hidden = torch.cat([hidden[-2], hidden[-1]], dim=1)  # (batch, hidden*2)
        hidden_dec = hidden[:, : self.hidden_size].unsqueeze(0)  # (1, batch, hidden)
        cell_dec = torch.zeros_like(hidden_dec)

        # Decode
        outputs = []
        last_pred = x[:, -1, 0:1].unsqueeze(1)  # (batch, 1, 1) last target value

        for t in range(self.pred_len):
            context, _ = self.attention(encoder_outputs, hidden_dec.squeeze(0))
            dec_input = torch.cat([context.unsqueeze(1), last_pred], dim=2)
            dec_output, (hidden_dec, cell_dec) = self.decoder(dec_input, (hidden_dec, cell_dec))
            pred = self.fc(dec_output.squeeze(1))
            outputs.append(pred)

            # Teacher forcing
            if target is not None and torch.rand(1).item() < teacher_force_ratio:
                last_pred = target[:, t : t + 1].unsqueeze(1)
            else:
                last_pred = pred.unsqueeze(1)

        return torch.cat(outputs, dim=1)  # (batch, pred_len)


class LSTMForecastingModel:
    """
    LSTM-based demand forecasting model with MLflow tracking.
    Complements TFT as an alternative/ensemble member.
    """

    SEQ_LEN = 60
    BATCH_SIZE = 128
    HIDDEN_SIZE = 256
    NUM_LAYERS = 3
    DROPOUT = 0.2
    MAX_EPOCHS = 30
    LEARNING_RATE = 1e-3

    def __init__(
        self,
        horizon: int = 30,
        mlflow_tracking_uri: str = "http://localhost:5000",
        experiment_name: str = "supplysense-lstm-forecasting",
    ):
        self.horizon = horizon
        self.mlflow_tracking_uri = mlflow_tracking_uri
        self.experiment_name = experiment_name
        self.model: Optional[LSTMForecastNet] = None
        self.feature_means: Optional[np.ndarray] = None
        self.feature_stds: Optional[np.ndarray] = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        mlflow.set_tracking_uri(mlflow_tracking_uri)
        mlflow.set_experiment(experiment_name)

    def _normalize(self, data: np.ndarray, fit: bool = True) -> np.ndarray:
        if fit:
            self.feature_means = data.mean(axis=0)
            self.feature_stds = data.std(axis=0) + 1e-8
        return (data - self.feature_means) / self.feature_stds

    def _denormalize_target(self, preds: np.ndarray) -> np.ndarray:
        return preds * self.feature_stds[0] + self.feature_means[0]

    def _prepare_features(self, df: pd.DataFrame) -> np.ndarray:
        """Extract feature matrix from demand DataFrame."""
        df = df.copy()
        df["date"] = pd.to_datetime(df["date"])
        df = df.sort_values("date")

        feature_cols = [
            "quantity", "promo_flag", "holiday_flag",
            "weather_index", "competitor_price",
        ]
        for col in feature_cols:
            if col not in df.columns:
                df[col] = 0.0

        # Additional temporal features
        df["dow_sin"] = np.sin(2 * np.pi * df["date"].dt.dayofweek / 7)
        df["dow_cos"] = np.cos(2 * np.pi * df["date"].dt.dayofweek / 7)
        df["month_sin"] = np.sin(2 * np.pi * df["date"].dt.month / 12)
        df["month_cos"] = np.cos(2 * np.pi * df["date"].dt.month / 12)

        all_cols = feature_cols + ["dow_sin", "dow_cos", "month_sin", "month_cos"]
        return df[all_cols].values.astype(np.float32)

    def train(self, df: pd.DataFrame, sku_id: Optional[str] = None) -> dict:
        """Train LSTM on demand history for a single SKU or aggregated."""
        if sku_id:
            df = df[df["sku_id"] == sku_id].copy()

        data = self._prepare_features(df)
        data_norm = self._normalize(data, fit=True)

        n_train = int(len(data_norm) * 0.85)
        train_data = data_norm[:n_train]
        val_data = data_norm[n_train - self.SEQ_LEN:]

        train_ds = DemandSequenceDataset(train_data, self.SEQ_LEN, self.horizon)
        val_ds = DemandSequenceDataset(val_data, self.SEQ_LEN, self.horizon)

        train_loader = DataLoader(train_ds, batch_size=self.BATCH_SIZE, shuffle=True, drop_last=True)
        val_loader = DataLoader(val_ds, batch_size=self.BATCH_SIZE, shuffle=False)

        self.model = LSTMForecastNet(
            input_size=data.shape[1],
            hidden_size=self.HIDDEN_SIZE,
            num_layers=self.NUM_LAYERS,
            pred_len=self.horizon,
            dropout=self.DROPOUT,
        ).to(self.device)

        optimizer = torch.optim.AdamW(self.model.parameters(), lr=self.LEARNING_RATE, weight_decay=1e-5)
        scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=self.MAX_EPOCHS)
        criterion = nn.HuberLoss(delta=1.0)

        with mlflow.start_run() as run:
            mlflow.log_params({
                "model_type": "BiLSTM-Attention",
                "hidden_size": self.HIDDEN_SIZE,
                "num_layers": self.NUM_LAYERS,
                "horizon": self.horizon,
                "seq_len": self.SEQ_LEN,
            })

            best_val_loss = float("inf")
            patience_counter = 0
            patience = 7

            for epoch in range(self.MAX_EPOCHS):
                # Training
                self.model.train()
                train_losses = []
                for x, y in train_loader:
                    x, y = x.to(self.device), y.to(self.device)
                    optimizer.zero_grad()
                    pred = self.model(x, teacher_force_ratio=0.5, target=y)
                    loss = criterion(pred, y)
                    loss.backward()
                    torch.nn.utils.clip_grad_norm_(self.model.parameters(), 1.0)
                    optimizer.step()
                    train_losses.append(loss.item())

                # Validation
                self.model.eval()
                val_losses = []
                with torch.no_grad():
                    for x, y in val_loader:
                        x, y = x.to(self.device), y.to(self.device)
                        pred = self.model(x, teacher_force_ratio=0.0)
                        val_losses.append(criterion(pred, y).item())

                train_loss = np.mean(train_losses)
                val_loss = np.mean(val_losses)
                scheduler.step()

                mlflow.log_metrics({"train_loss": train_loss, "val_loss": val_loss}, step=epoch)
                logger.info(f"Epoch {epoch+1}/{self.MAX_EPOCHS} | Train: {train_loss:.4f} | Val: {val_loss:.4f}")

                if val_loss < best_val_loss:
                    best_val_loss = val_loss
                    patience_counter = 0
                    torch.save(self.model.state_dict(), "/tmp/lstm_best.pt")
                else:
                    patience_counter += 1
                    if patience_counter >= patience:
                        logger.info("Early stopping triggered.")
                        break

            # Load best checkpoint
            self.model.load_state_dict(torch.load("/tmp/lstm_best.pt", map_location=self.device))
            
            # Compute final metrics
            metrics = self._evaluate_on_loader(val_loader)
            mlflow.log_metrics(metrics)
            mlflow.pytorch.log_model(self.model, "lstm_model")

            return {**metrics, "run_id": run.info.run_id}

    def _evaluate_on_loader(self, loader: DataLoader) -> dict:
        self.model.eval()
        all_preds, all_true = [], []
        with torch.no_grad():
            for x, y in loader:
                x = x.to(self.device)
                preds = self.model(x, teacher_force_ratio=0.0).cpu().numpy()
                all_preds.append(preds)
                all_true.append(y.numpy())

        y_hat = self._denormalize_target(np.concatenate(all_preds).flatten())
        y_true = self._denormalize_target(np.concatenate(all_true).flatten())
        y_hat = np.maximum(y_hat, 0)
        y_true = np.maximum(y_true, 0)

        mask = y_true > 0
        mape = float(np.mean(np.abs((y_true[mask] - y_hat[mask]) / y_true[mask])) * 100)
        rmse = float(np.sqrt(np.mean((y_true - y_hat) ** 2)))
        mae = float(np.mean(np.abs(y_true - y_hat)))
        return {"mape": mape, "rmse": rmse, "mae": mae}

    def predict(self, df: pd.DataFrame, sku_id: Optional[str] = None) -> pd.DataFrame:
        """Generate rolling forecasts."""
        if self.model is None:
            raise ValueError("Model not trained.")
        if sku_id:
            df = df[df["sku_id"] == sku_id].copy()

        data = self._prepare_features(df)
        data_norm = self._normalize(data, fit=False)

        # Use last SEQ_LEN days as input
        x = torch.FloatTensor(data_norm[-self.SEQ_LEN:]).unsqueeze(0).to(self.device)

        self.model.eval()
        with torch.no_grad():
            preds_norm = self.model(x, teacher_force_ratio=0.0).cpu().numpy()[0]

        preds = self._denormalize_target(preds_norm)
        base_date = pd.Timestamp.now().normalize()

        results = []
        for day_offset, pred in enumerate(preds):
            results.append({
                "date": base_date + pd.Timedelta(days=day_offset + 1),
                "predicted_quantity": max(0.0, float(pred)),
                "lower_bound": max(0.0, float(pred * 0.85)),
                "upper_bound": max(0.0, float(pred * 1.15)),
            })

        return pd.DataFrame(results)
