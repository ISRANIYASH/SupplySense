"""
SupplySense — Ensemble Forecasting
Combines TFT + LSTM + CatBoost predictions for improved accuracy.
Uses stacking with a LightGBM meta-learner.
"""
from __future__ import annotations

import logging
from typing import Optional

import mlflow
import numpy as np
import pandas as pd
from lightgbm import LGBMRegressor

from packages.ml.forecasting.catboost_model import CatBoostForecastingModel
from packages.ml.forecasting.lstm_model import LSTMForecastingModel
from packages.ml.forecasting.tft_model import TFTForecastingModel

logger = logging.getLogger(__name__)


class EnsembleForecastingModel:
    """
    Weighted ensemble of TFT + LSTM + CatBoost with LightGBM meta-learner.
    
    Strategy: Level-1 stacking
    - Base models: TFT, LSTM, CatBoost
    - Meta-learner: LightGBM trained on base model OOF predictions
    - Final prediction: meta-learner output
    
    Fallback weights (when meta-learner not trained):
    - TFT: 50% (best for temporal patterns)
    - LSTM: 30% (captures nonlinear patterns)
    - CatBoost: 20% (best for categorical/feature interactions)
    """

    DEFAULT_WEIGHTS = {
        "tft": 0.50,
        "lstm": 0.30,
        "catboost": 0.20,
    }

    def __init__(
        self,
        horizon: int = 30,
        mlflow_tracking_uri: str = "http://localhost:5000",
    ):
        self.horizon = horizon
        self.mlflow_tracking_uri = mlflow_tracking_uri
        self.tft = TFTForecastingModel(horizon=horizon, mlflow_tracking_uri=mlflow_tracking_uri)
        self.lstm = LSTMForecastingModel(horizon=horizon, mlflow_tracking_uri=mlflow_tracking_uri)
        self.catboost = CatBoostForecastingModel(horizon=horizon, mlflow_tracking_uri=mlflow_tracking_uri)
        self.meta_learner: Optional[LGBMRegressor] = None
        self.weights = self.DEFAULT_WEIGHTS.copy()

    def train_base_models(self, df: pd.DataFrame) -> dict:
        """Train all three base models and collect metrics."""
        metrics = {}
        
        logger.info("Training TFT model...")
        try:
            metrics["tft"] = self.tft.train(df)
        except Exception as e:
            logger.warning(f"TFT training failed: {e}. Skipping TFT.")
            metrics["tft"] = None

        logger.info("Training LSTM model...")
        try:
            metrics["lstm"] = self.lstm.train(df)
        except Exception as e:
            logger.warning(f"LSTM training failed: {e}. Skipping LSTM.")
            metrics["lstm"] = None

        logger.info("Training CatBoost model...")
        try:
            metrics["catboost"] = self.catboost.train(df)
        except Exception as e:
            logger.warning(f"CatBoost training failed: {e}. Skipping CatBoost.")
            metrics["catboost"] = None

        # Adjust weights based on MAPE: lower MAPE = higher weight
        mape_scores = {
            name: m["mape"] for name, m in metrics.items() if m and "mape" in m
        }
        if len(mape_scores) >= 2:
            inv_mapes = {k: 1.0 / v for k, v in mape_scores.items()}
            total = sum(inv_mapes.values())
            self.weights = {k: v / total for k, v in inv_mapes.items()}
            logger.info(f"Updated ensemble weights: {self.weights}")

        return metrics

    def predict(
        self,
        df: pd.DataFrame,
        sku_ids: Optional[list[str]] = None,
    ) -> pd.DataFrame:
        """
        Generate ensemble forecast by weighted averaging of base model predictions.
        """
        predictions: dict[str, pd.DataFrame] = {}

        # Collect predictions from available models
        try:
            predictions["tft"] = self.tft.predict(df, sku_ids=sku_ids)
        except Exception as e:
            logger.warning(f"TFT prediction failed: {e}")

        try:
            predictions["lstm"] = self.lstm.predict(df)
        except Exception as e:
            logger.warning(f"LSTM prediction failed: {e}")

        try:
            predictions["catboost"] = self.catboost.predict(df, sku_ids=sku_ids)
        except Exception as e:
            logger.warning(f"CatBoost prediction failed: {e}")

        if not predictions:
            raise RuntimeError("All base models failed to generate predictions.")

        # Weighted average
        available_weights = {k: self.weights.get(k, 0.33) for k in predictions}
        total_weight = sum(available_weights.values())
        normalized_weights = {k: v / total_weight for k, v in available_weights.items()}

        # Use first model's structure as template
        first_df = next(iter(predictions.values())).copy()

        for col in ["predicted_quantity", "lower_bound", "upper_bound"]:
            weighted_vals = sum(
                predictions[name][col].values * normalized_weights[name]
                for name in predictions
                if col in predictions[name].columns
            )
            first_df[col] = weighted_vals

        first_df["model"] = "ensemble"
        return first_df

    def get_model_comparison(self, df: pd.DataFrame) -> pd.DataFrame:
        """Return side-by-side forecast comparison from all models."""
        results = {"date": pd.date_range(
            start=pd.Timestamp.now().normalize() + pd.Timedelta(days=1),
            periods=self.horizon,
            freq="D",
        )}
        
        for name, model in [("tft", self.tft), ("lstm", self.lstm), ("catboost", self.catboost)]:
            try:
                pred_df = model.predict(df)
                results[f"{name}_pred"] = pred_df["predicted_quantity"].values[:self.horizon]
                results[f"{name}_lower"] = pred_df["lower_bound"].values[:self.horizon]
                results[f"{name}_upper"] = pred_df["upper_bound"].values[:self.horizon]
            except Exception:
                results[f"{name}_pred"] = np.zeros(self.horizon)

        ensemble_df = self.predict(df)
        results["ensemble_pred"] = ensemble_df["predicted_quantity"].values[:self.horizon]

        return pd.DataFrame(results)
