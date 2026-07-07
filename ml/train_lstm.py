import os
import sys
import json
import torch
import torch.nn as nn
import torch.optim as optim
import matplotlib.pyplot as plt
import mlflow

# Silence git warnings from MLflow
os.environ["GIT_PYTHON_REFRESH"] = "quiet"

# Allow importing sibling modules when run as `python ml/train_lstm.py`
sys.path.insert(0, os.path.dirname(__file__))

from data_loader import prepare_dataloaders
from lstm_model import DemandLSTM, train_epoch, evaluate, EarlyStopping


def main():
    # ---------- MLflow setup ----------
    mlflow.set_tracking_uri("sqlite:///mlruns/mlflow.db")
    mlflow.set_experiment("Demand_Forecast_LSTM")

    os.makedirs("models",  exist_ok=True)
    os.makedirs("reports", exist_ok=True)
    os.makedirs("mlruns",  exist_ok=True)

    # ---------- Hyperparameters ----------
    lookback    = 14
    batch_size  = 64
    hidden1     = 256
    hidden2     = 128
    hidden3     = 64
    dropout     = 0.2
    lr          = 0.001
    epochs      = 100
    early_stop_patience = 15
    lr_patience = 5

    # ---------- Data ----------
    print("Loading and scaling data...")
    train_loader, val_loader, test_loader, num_features, target_scaler = \
        prepare_dataloaders(lookback, batch_size)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    # ---------- Model ----------
    model = DemandLSTM(
        input_size=num_features,
        hidden_size1=hidden1,
        hidden_size2=hidden2,
        hidden_size3=hidden3,
    ).to(device)

    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=lr)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=lr_patience, factor=0.5)
    early_stopping = EarlyStopping(patience=early_stop_patience)

    # ---------- Training ----------
    print("Starting training...\n")

    with mlflow.start_run():
        mlflow.log_params({
            "lookback":         lookback,
            "batch_size":       batch_size,
            "hidden1":          hidden1,
            "hidden2":          hidden2,
            "hidden3":          hidden3,
            "dropout":          dropout,
            "learning_rate":    lr,
            "max_epochs":       epochs,
            "patience":         early_stop_patience,
            "lr_patience":      lr_patience,
            "num_features":     num_features,
            "optimizer":        "Adam",
            "loss":             "MSELoss",
            "scaling":          "MinMaxScaler",
        })

        best_val_loss = float("inf")

        for epoch in range(1, epochs + 1):
            train_loss = train_epoch(model, train_loader, criterion, optimizer, device)
            val_loss, val_mae, val_rmse, val_mape, _, _ = evaluate(
                model, val_loader, criterion, device, target_scaler
            )

            scheduler.step(val_loss)

            if epoch % 10 == 0 or epoch == 1:
                print(
                    f"Epoch {epoch:>3}/{epochs} | "
                    f"Train Loss: {train_loss:.6f} | "
                    f"Val Loss: {val_loss:.6f} | "
                    f"Val MAPE: {val_mape:.2f}%"
                )

            mlflow.log_metrics(
                {
                    "train_loss": train_loss,
                    "val_loss":   val_loss,
                    "val_mae":    val_mae,
                    "val_rmse":   val_rmse,
                    "val_mape":   val_mape,
                },
                step=epoch,
            )

            if val_loss < best_val_loss:
                best_val_loss = val_loss
                torch.save(model.state_dict(), "models/lstm_best.pt")

            early_stopping(val_loss)
            if early_stopping.early_stop:
                print(f"\nEarly stopping triggered at epoch {epoch}.")
                break

        # ---------- Test Evaluation ----------
        print("\nTraining complete. Evaluating on test set...")
        model.load_state_dict(torch.load("models/lstm_best.pt", weights_only=True))
        test_loss, test_mae, test_rmse, test_mape, test_preds, test_targets = evaluate(
            model, test_loader, criterion, device, target_scaler
        )

        print("\n" + "=" * 50)
        print("  FINAL TEST METRICS (original demand units)")
        print("=" * 50)
        print(f"  MAPE : {test_mape:.2f}%")
        print(f"  MAE  : {test_mae:.4f}")
        print(f"  RMSE : {test_rmse:.4f}")
        print("=" * 50 + "\n")

        mlflow.log_metrics({
            "test_mape": test_mape,
            "test_mae":  test_mae,
            "test_rmse": test_rmse,
        })

        # Save metrics JSON
        metrics_dict = {
            "test_mape": float(test_mape),
            "test_mae":  float(test_mae),
            "test_rmse": float(test_rmse),
        }
        with open("models/lstm_metrics.json", "w") as f:
            json.dump(metrics_dict, f, indent=4)
        print("Saved metrics -> models/lstm_metrics.json")

        # ---------- Forecast Chart ----------
        num_points = min(200, len(test_preds))
        fig, ax = plt.subplots(figsize=(14, 6))
        ax.plot(test_targets[:num_points], label="Actual Demand",    color="#2196F3", alpha=0.85, linewidth=1.5)
        ax.plot(test_preds[:num_points],   label="Predicted Demand", color="#F44336", alpha=0.85, linewidth=1.5, linestyle="--")
        ax.set_title(f"LSTM Demand Forecast vs Actual — Test Set (first {num_points} pts)\nMAPE={test_mape:.2f}%  MAE={test_mae:.2f}  RMSE={test_rmse:.2f}")
        ax.set_xlabel("Time Step")
        ax.set_ylabel("Daily Demand Quantity")
        ax.legend()
        ax.grid(True, alpha=0.3)
        plt.tight_layout()
        plt.savefig("reports/lstm_forecast_vs_actual.png", dpi=150)
        plt.close()
        print("Saved chart -> reports/lstm_forecast_vs_actual.png")

        # Confirm model artefact
        model_path = os.path.abspath("models/lstm_best.pt")
        print(f"Best model saved -> {model_path}")
        print("\nMLflow run logged to mlruns/mlflow.db")


if __name__ == "__main__":
    main()
