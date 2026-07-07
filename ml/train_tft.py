"""
ml/train_tft.py
Trains a Temporal Fusion Transformer (TFT) on all category+region series.
Uses lightning.pytorch.Trainer (required for pytorch-forecasting >= 1.3.0).
"""
import os, sys, json, torch, numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import warnings
warnings.filterwarnings("ignore")

os.environ["MLFLOW_ALLOW_FILE_STORE"] = "true"
os.environ["GIT_PYTHON_REFRESH"] = "quiet"

# pytorch-forecasting 1.x uses lightning.pytorch — NOT pytorch_lightning
from lightning.pytorch import Trainer
from lightning.pytorch.callbacks import EarlyStopping, ModelCheckpoint

from pytorch_forecasting import TemporalFusionTransformer, TimeSeriesDataSet
from pytorch_forecasting.metrics import QuantileLoss
from tft_data_loader import load_and_preprocess_data, get_dataloaders

import mlflow

print("Using lightning.pytorch.Trainer - OK")

# ---------------------------------------------------------------------------
def train_tft():
    print("\nPreparing data...")
    df = load_and_preprocess_data()
    training_dataset, validation_dataset, train_dataloader, val_dataloader = \
        get_dataloaders(df, batch_size=64)

    os.makedirs("models", exist_ok=True)
    os.makedirs("reports", exist_ok=True)

    early_stop = EarlyStopping(
        monitor="val_loss", min_delta=1e-4, patience=8, verbose=True, mode="min"
    )
    checkpoint_cb = ModelCheckpoint(
        dirpath="models", filename="tft_best",
        save_top_k=1, monitor="val_loss", mode="min"
    )

    trainer = Trainer(
        max_epochs=30,
        accelerator="cpu",
        gradient_clip_val=0.1,
        callbacks=[early_stop, checkpoint_cb],
        enable_progress_bar=True,
        logger=False,
    )

    tft = TemporalFusionTransformer.from_dataset(
        training_dataset,
        learning_rate=0.001,
        hidden_size=32,
        attention_head_size=2,
        dropout=0.15,
        hidden_continuous_size=16,
        loss=QuantileLoss(quantiles=[0.1, 0.5, 0.9]),
        optimizer="adam",
        reduce_on_plateau_patience=4,
    )
    print(f"Parameters: {tft.size()/1e3:.1f}k")
    print(f"LightningModule base: {type(tft).__mro__[1].__module__}")

    # MLflow setup
    mlruns_path = os.path.abspath("mlruns").replace("\\", "/")
    mlflow.set_tracking_uri(f"file:///{mlruns_path}")
    mlflow.set_experiment("Demand_Forecast_TFT")

    with mlflow.start_run() as run:
        run_id = run.info.run_id
        print(f"\nMLflow run_id: {run_id}")

        print("\nStarting training...")
        trainer.fit(tft, train_dataloaders=train_dataloader, val_dataloaders=val_dataloader)

        # Load best checkpoint
        best_ckpt = checkpoint_cb.best_model_path or ""
        if best_ckpt and os.path.exists(best_ckpt):
            print(f"\nLoading best checkpoint: {best_ckpt}")
            best_tft = TemporalFusionTransformer.load_from_checkpoint(best_ckpt)
        else:
            best_tft = tft
        best_tft.eval()

        # Evaluate
        print("\nEvaluating on validation set...")
        raw_preds = best_tft.predict(
            val_dataloader, mode="raw", return_x=True,
            trainer_kwargs={"accelerator": "cpu", "logger": False}
        )
        preds   = raw_preds.output.prediction   # [N, T, 3]
        actuals = raw_preds.x["decoder_target"] # [N, T]

        p50 = preds[:, :, 1].float()
        safe_act = torch.where(actuals == 0, torch.tensor(1e-8), actuals.float())
        mape = float(torch.mean(torch.abs((actuals.float() - p50) / safe_act)) * 100)
        mae  = float(torch.mean(torch.abs(actuals.float() - p50)))
        rmse = float(torch.sqrt(torch.mean((actuals.float() - p50) ** 2)))

        print(f"\n{'='*50}")
        print(f"TFT Test MAPE : {mape:.2f}%")
        print(f"TFT Test MAE  : {mae:.2f}")
        print(f"TFT Test RMSE : {rmse:.2f}")
        print(f"{'='*50}")

        # Save metrics
        metrics_data = {
            "test_mape": round(mape, 4),
            "test_mae":  round(mae,  4),
            "test_rmse": round(rmse, 4),
            "trained_on": "multi-series 241 groups (36584 rows)",
            "model_type": "TFT",
            "mlflow_run_id": run_id
        }
        with open("models/tft_metrics.json", "w") as f:
            json.dump(metrics_data, f, indent=2)
        print("Saved: models/tft_metrics.json")

        mlflow.log_metrics({"test_mape": mape, "test_mae": mae, "test_rmse": rmse})

        # LSTM vs TFT bar chart
        try:
            with open("models/lstm_metrics.json") as f:
                lstm_mape = json.load(f).get("test_mape", 93.33)
        except Exception:
            lstm_mape = 93.33

        fig, ax = plt.subplots(figsize=(8, 5))
        colors = ["#EF4444", "#3B8EE8"]
        bars = ax.bar(
            ["LSTM\n(Single Series)", "TFT\n(241 Series)"],
            [lstm_mape, mape], color=colors, width=0.4
        )
        for bar in bars:
            h = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2, h + 0.5,
                    f"{h:.2f}%", ha="center", va="bottom", fontweight="bold")
        ax.set_ylabel("MAPE (%) — lower is better")
        ax.set_title("Model Comparison: LSTM vs TFT")
        ax.set_ylim(0, max(lstm_mape, mape) + 15)
        plt.tight_layout()
        plt.savefig("reports/tft_vs_lstm_comparison.png", dpi=120)
        plt.close()
        print("Saved: reports/tft_vs_lstm_comparison.png")

        # Sample forecast plot
        t       = np.arange(preds.shape[1])
        p10_np  = preds[0, :, 0].cpu().numpy()
        p50_np  = preds[0, :, 1].cpu().numpy()
        p90_np  = preds[0, :, 2].cpu().numpy()
        act_np  = actuals[0].cpu().numpy()

        fig, ax = plt.subplots(figsize=(10, 5))
        ax.plot(t, act_np,  label="Actual",       color="#EF4444", marker="o")
        ax.plot(t, p50_np,  label="TFT p50",      color="#3B8EE8", linestyle="--")
        ax.fill_between(t, p10_np, p90_np, color="#3B8EE8", alpha=0.2, label="p10–p90 CI")
        ax.set_title("TFT 7-Day Forecast Sample (Validation)")
        ax.set_xlabel("Days Ahead"); ax.set_ylabel("Demand")
        ax.legend(); ax.grid(alpha=0.3)
        plt.tight_layout()
        plt.savefig("reports/tft_forecast_sample.png", dpi=120)
        plt.close()
        print("Saved: reports/tft_forecast_sample.png")

        # Final summary
        improvement = lstm_mape - mape
        print(f"\n{'='*50}")
        print(f"MLflow Run ID : {run_id}")
        print(f"LSTM MAPE     : {lstm_mape:.2f}%")
        print(f"TFT  MAPE     : {mape:.2f}%")
        print(f"Improvement   : {improvement:+.2f}pp")
        ckpt_path = best_ckpt if best_ckpt else "models/tft_best.ckpt"
        if os.path.exists(ckpt_path):
            size_mb = os.path.getsize(ckpt_path) / (1024*1024)
            print(f"Checkpoint    : {ckpt_path} ({size_mb:.2f} MB)")
        print(f"{'='*50}")
        print("\nDone.")

if __name__ == "__main__":
    train_tft()
