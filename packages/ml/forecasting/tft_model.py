"""
SupplySense — Temporal Fusion Transformer (TFT) Demand Forecasting Model
Uses pytorch-forecasting's TFT implementation for multi-horizon demand forecasting.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

import mlflow
import mlflow.pytorch
import numpy as np
import pandas as pd
import torch
from pytorch_forecasting import TemporalFusionTransformer, TimeSeriesDataSet
from pytorch_forecasting.data import GroupNormalizer
from pytorch_forecasting.metrics import MAE, MAPE, RMSE, QuantileLoss
from pytorch_lightning import Trainer
from pytorch_lightning.callbacks import EarlyStopping, LearningRateMonitor, ModelCheckpoint
from pytorch_lightning.loggers import MLFlowLogger

logger = logging.getLogger(__name__)


class TFTForecastingModel:
    """
    Temporal Fusion Transformer for supply chain demand forecasting.
    
    Supports:
    - Multi-horizon forecasting (7/14/30/90 days)
    - Multiple time series (per SKU)
    - Known covariates (promotions, holidays)
    - Unknown covariates (weather, competitor)
    - Static covariates (product category, supplier)
    - Quantile predictions (10th, 50th, 90th percentiles)
    """

    MAX_ENCODER_LENGTH = 90     # 90 days of history
    MAX_PREDICTION_LENGTH = 30  # default 30-day horizon
    BATCH_SIZE = 64
    MAX_EPOCHS = 50
    LEARNING_RATE = 1e-3
    HIDDEN_SIZE = 256
    ATTENTION_HEAD_SIZE = 4
    DROPOUT = 0.1
    HIDDEN_CONTINUOUS_SIZE = 64

    def __init__(
        self,
        horizon: int = 30,
        mlflow_tracking_uri: str = "http://localhost:5000",
        experiment_name: str = "supplysense-tft-forecasting",
        model_path: Optional[Path] = None,
    ):
        self.horizon = horizon
        self.mlflow_tracking_uri = mlflow_tracking_uri
        self.experiment_name = experiment_name
        self.model_path = model_path
        self.model: Optional[TemporalFusionTransformer] = None
        self.training_dataset: Optional[TimeSeriesDataSet] = None
        self._setup_mlflow()

    def _setup_mlflow(self) -> None:
        mlflow.set_tracking_uri(self.mlflow_tracking_uri)
        mlflow.set_experiment(self.experiment_name)

    def _prepare_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Prepare raw demand data for TFT training.
        
        Expected input columns:
            date, sku_id, quantity, promo_flag, holiday_flag,
            weather_index, competitor_price, category, supplier_id
        """
        df = df.copy()
        df["date"] = pd.to_datetime(df["date"])
        df = df.sort_values(["sku_id", "date"])

        # Time index (required by pytorch-forecasting)
        df["time_idx"] = (
            (df["date"] - df["date"].min()) / pd.Timedelta("1D")
        ).astype(int)

        # Date-derived features
        df["day_of_week"] = df["date"].dt.dayofweek.astype(str)
        df["month"] = df["date"].dt.month.astype(str)
        df["is_weekend"] = (df["date"].dt.dayofweek >= 5).astype(int)

        # Log-transform quantity to handle skewness
        df["log_quantity"] = np.log1p(df["quantity"].clip(lower=0))

        # Fill missing covariates
        df["promo_flag"] = df.get("promo_flag", 0).fillna(0).astype(int)
        df["holiday_flag"] = df.get("holiday_flag", 0).fillna(0).astype(int)
        df["weather_index"] = df.get("weather_index", 5.0).fillna(5.0)
        df["competitor_price"] = df.get("competitor_price", 100.0).fillna(100.0)

        return df

    def _build_dataset(
        self, df: pd.DataFrame, train: bool = True
    ) -> TimeSeriesDataSet:
        """Build pytorch-forecasting TimeSeriesDataSet."""
        cutoff = df["time_idx"].max() - self.horizon

        return TimeSeriesDataSet(
            df[df["time_idx"] <= cutoff] if train else df,
            time_idx="time_idx",
            target="log_quantity",
            group_ids=["sku_id"],
            min_encoder_length=self.MAX_ENCODER_LENGTH // 2,
            max_encoder_length=self.MAX_ENCODER_LENGTH,
            min_prediction_length=1,
            max_prediction_length=self.horizon,
            static_categoricals=["category", "supplier_id"],
            time_varying_known_categoricals=["day_of_week", "month"],
            time_varying_known_reals=[
                "time_idx", "promo_flag", "holiday_flag", "is_weekend"
            ],
            time_varying_unknown_reals=[
                "log_quantity", "weather_index", "competitor_price"
            ],
            target_normalizer=GroupNormalizer(
                groups=["sku_id"], transformation="softplus"
            ),
            add_relative_time_idx=True,
            add_target_scales=True,
            add_encoder_length=True,
        )

    def _build_model(self) -> TemporalFusionTransformer:
        """Instantiate TFT model from training dataset spec."""
        assert self.training_dataset is not None, "Training dataset not built yet"
        return TemporalFusionTransformer.from_dataset(
            self.training_dataset,
            learning_rate=self.LEARNING_RATE,
            hidden_size=self.HIDDEN_SIZE,
            attention_head_size=self.ATTENTION_HEAD_SIZE,
            dropout=self.DROPOUT,
            hidden_continuous_size=self.HIDDEN_CONTINUOUS_SIZE,
            loss=QuantileLoss(quantiles=[0.1, 0.5, 0.9]),
            log_interval=10,
            reduce_on_plateau_patience=4,
        )

    def train(
        self,
        df: pd.DataFrame,
        val_fraction: float = 0.1,
        fast_dev_run: bool = False,
    ) -> dict:
        """
        Train TFT model on historical demand data.
        
        Returns:
            dict with MAPE, RMSE, MAE on validation set and MLflow run_id.
        """
        logger.info("Preparing training data for TFT model...")
        df = self._prepare_data(df)

        # Build training dataset
        self.training_dataset = self._build_dataset(df, train=True)
        
        # Validation dataset (same spec, different time range)
        cutoff = df["time_idx"].max() - self.horizon
        val_start = cutoff - int((cutoff - self.MAX_ENCODER_LENGTH) * val_fraction)
        validation_dataset = TimeSeriesDataSet.from_dataset(
            self.training_dataset,
            df[df["time_idx"] >= val_start],
            predict=True,
            stop_randomization=True,
        )

        train_loader = self.training_dataset.to_dataloader(
            train=True, batch_size=self.BATCH_SIZE, num_workers=0
        )
        val_loader = validation_dataset.to_dataloader(
            train=False, batch_size=self.BATCH_SIZE * 4, num_workers=0
        )

        # Build model
        self.model = self._build_model()
        logger.info(f"TFT model parameters: {sum(p.numel() for p in self.model.parameters()):,}")

        with mlflow.start_run() as run:
            mlflow.log_params({
                "model_type": "TFT",
                "horizon": self.horizon,
                "hidden_size": self.HIDDEN_SIZE,
                "attention_heads": self.ATTENTION_HEAD_SIZE,
                "dropout": self.DROPOUT,
                "max_epochs": self.MAX_EPOCHS,
                "batch_size": self.BATCH_SIZE,
            })

            callbacks = [
                EarlyStopping(monitor="val_loss", patience=5, mode="min"),
                LearningRateMonitor(),
                ModelCheckpoint(
                    monitor="val_loss",
                    filename="tft-{epoch:02d}-{val_loss:.4f}",
                    save_top_k=1,
                ),
            ]

            trainer = Trainer(
                max_epochs=1 if fast_dev_run else self.MAX_EPOCHS,
                accelerator="auto",
                enable_progress_bar=True,
                gradient_clip_val=0.1,
                callbacks=callbacks,
                logger=MLFlowLogger(
                    experiment_name=self.experiment_name,
                    tracking_uri=self.mlflow_tracking_uri,
                    run_id=run.info.run_id,
                ),
            )

            trainer.fit(self.model, train_dataloaders=train_loader, val_dataloaders=val_loader)

            # Evaluate
            metrics = self._evaluate(validation_dataset, val_loader)
            mlflow.log_metrics(metrics)
            mlflow.pytorch.log_model(self.model, "tft_model")

            logger.info(f"Training complete. MAPE: {metrics['mape']:.4f}, RMSE: {metrics['rmse']:.4f}")
            return {**metrics, "run_id": run.info.run_id}

    def _evaluate(self, dataset: TimeSeriesDataSet, loader) -> dict:
        """Evaluate model on validation set."""
        predictions = self.model.predict(loader, return_y=True, trainer_kwargs={"accelerator": "auto"})
        
        # Extract median predictions (quantile 0.5 = index 1)
        y_hat = predictions.output[:, :, 1].numpy().flatten()
        y_true = predictions.y[0].numpy().flatten()
        
        # Back-transform from log scale
        y_hat = np.expm1(y_hat)
        y_true = np.expm1(y_true)
        
        mask = y_true > 0
        mape = float(np.mean(np.abs((y_true[mask] - y_hat[mask]) / y_true[mask])) * 100)
        rmse = float(np.sqrt(np.mean((y_true - y_hat) ** 2)))
        mae = float(np.mean(np.abs(y_true - y_hat)))
        bias = float(np.mean(y_hat - y_true))

        return {"mape": mape, "rmse": rmse, "mae": mae, "bias": bias}

    def predict(
        self,
        df: pd.DataFrame,
        sku_ids: Optional[list[str]] = None,
        horizon: Optional[int] = None,
    ) -> pd.DataFrame:
        """
        Generate demand forecasts.
        
        Returns:
            DataFrame with columns: sku_id, date, predicted_quantity,
            lower_bound (10th pct), upper_bound (90th pct)
        """
        if self.model is None:
            raise ValueError("Model not trained. Call train() first.")

        df = self._prepare_data(df)
        if sku_ids:
            df = df[df["sku_id"].isin(sku_ids)]

        horizon = horizon or self.horizon
        dataset = TimeSeriesDataSet.from_dataset(
            self.training_dataset, df, predict=True, stop_randomization=True
        )
        loader = dataset.to_dataloader(train=False, batch_size=128, num_workers=0)
        
        raw_preds, index = self.model.predict(loader, return_index=True, return_x=False, mode="quantiles")
        
        results = []
        for idx, (sku, preds) in enumerate(zip(index["sku_id"].values, raw_preds)):
            base_date = pd.Timestamp.now().normalize()
            for day_offset in range(preds.shape[0]):
                results.append({
                    "sku_id": sku,
                    "date": base_date + pd.Timedelta(days=day_offset + 1),
                    "lower_bound": float(np.expm1(preds[day_offset, 0].item())),
                    "predicted_quantity": float(np.expm1(preds[day_offset, 1].item())),
                    "upper_bound": float(np.expm1(preds[day_offset, 2].item())),
                })

        return pd.DataFrame(results)

    def predict_with_scenario(
        self,
        df: pd.DataFrame,
        scenario: dict,
        sku_ids: Optional[list[str]] = None,
    ) -> dict:
        """
        Run what-if scenario forecast.
        
        scenario keys:
            promo_discount (0-50%), weather_severity (1-10),
            market_growth (-0.2 to 0.2), competitor_activity (0-2)
        """
        df_scenario = df.copy()

        # Apply scenario overrides
        if "promo_discount" in scenario and scenario["promo_discount"] > 0:
            df_scenario["promo_flag"] = 1
            # Price elasticity: each 10% discount ~8% demand lift
            elasticity = scenario["promo_discount"] / 10.0 * 0.08
            df_scenario["quantity"] = df_scenario["quantity"] * (1 + elasticity)

        if "weather_severity" in scenario:
            df_scenario["weather_index"] = float(scenario["weather_severity"])

        if "market_growth" in scenario:
            df_scenario["quantity"] = df_scenario["quantity"] * (1 + scenario["market_growth"])

        baseline = self.predict(df, sku_ids=sku_ids)
        scenario_forecast = self.predict(df_scenario, sku_ids=sku_ids)
        
        return {
            "baseline": baseline.to_dict("records"),
            "scenario": scenario_forecast.to_dict("records"),
            "delta": (
                scenario_forecast["predicted_quantity"] - baseline["predicted_quantity"]
            ).to_dict(),
        }

    @classmethod
    def load(cls, model_path: str, mlflow_run_id: Optional[str] = None) -> "TFTForecastingModel":
        """Load a saved TFT model from disk or MLflow."""
        instance = cls()
        if mlflow_run_id:
            instance.model = mlflow.pytorch.load_model(f"runs:/{mlflow_run_id}/tft_model")
        else:
            instance.model = TemporalFusionTransformer.load_from_checkpoint(model_path)
        logger.info(f"Loaded TFT model from {'MLflow' if mlflow_run_id else model_path}")
        return instance

    def save(self, path: str) -> None:
        """Save model checkpoint."""
        if self.model is None:
            raise ValueError("No model to save.")
        torch.save(self.model.state_dict(), path)
        logger.info(f"Saved TFT model to {path}")


def generate_synthetic_demand_data(
    n_skus: int = 50,
    n_days: int = 365,
    seed: int = 42,
) -> pd.DataFrame:
    """Generate realistic synthetic demand data for testing."""
    rng = np.random.default_rng(seed)
    
    categories = ["Electronics", "Apparel", "Food", "Industrial", "Healthcare"]
    suppliers = [f"SUP-{i:03d}" for i in range(1, 21)]
    
    records = []
    dates = pd.date_range(end=pd.Timestamp.now(), periods=n_days, freq="D")
    
    for sku_idx in range(n_skus):
        sku_id = f"SKU-{sku_idx + 1:04d}"
        category = rng.choice(categories)
        supplier = rng.choice(suppliers)
        
        # Base demand with trend
        base_demand = rng.uniform(50, 500)
        trend = rng.uniform(-0.001, 0.003)
        
        # Seasonality
        phase = rng.uniform(0, 2 * np.pi)
        seasonality_amplitude = rng.uniform(0.1, 0.4)
        
        for day_idx, date in enumerate(dates):
            # Trend component
            demand = base_demand * (1 + trend * day_idx)
            
            # Seasonal component
            seasonal_factor = 1 + seasonality_amplitude * np.sin(
                2 * np.pi * day_idx / 365 + phase
            )
            demand *= seasonal_factor
            
            # Day-of-week effect
            if date.dayofweek in [5, 6]:  # weekend
                demand *= rng.uniform(0.6, 0.8) if category != "Food" else rng.uniform(1.1, 1.3)
            
            # Random noise
            demand *= rng.lognormal(0, 0.1)
            
            # Promotions (random 10% of days)
            promo = 1 if rng.random() < 0.10 else 0
            if promo:
                demand *= rng.uniform(1.2, 1.6)
            
            records.append({
                "sku_id": sku_id,
                "date": date,
                "quantity": max(0, round(demand)),
                "category": category,
                "supplier_id": supplier,
                "promo_flag": promo,
                "holiday_flag": 1 if date.month == 12 and date.day >= 20 else 0,
                "weather_index": float(rng.uniform(1, 10)),
                "competitor_price": float(rng.uniform(80, 120)),
            })
    
    return pd.DataFrame(records)


if __name__ == "__main__":
    # Training example
    logging.basicConfig(level=logging.INFO)
    
    logger.info("Generating synthetic demand data...")
    df = generate_synthetic_demand_data(n_skus=20, n_days=180)
    
    logger.info(f"Dataset shape: {df.shape}")
    logger.info(f"SKUs: {df['sku_id'].nunique()}, Date range: {df['date'].min()} to {df['date'].max()}")
    
    model = TFTForecastingModel(horizon=30)
    metrics = model.train(df, fast_dev_run=True)
    logger.info(f"Training metrics: {metrics}")
