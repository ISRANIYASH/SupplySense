# ml/eval_tft.py
import json, os, torch, numpy as np
import pytorch_forecasting.data.encoders
import pytorch_forecasting.data.timeseries
import torch.serialization as ts
from pytorch_forecasting import TemporalFusionTransformer
from tft_data_loader import load_and_preprocess_data, get_dataloaders
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import warnings
warnings.filterwarnings("ignore")

# Patch torch.load to bypass weights_only=True defaults in PyTorch 2.6
_old_load = torch.load
def _new_load(*args, **kwargs):
    kwargs['weights_only'] = False
    return _old_load(*args, **kwargs)
torch.load = _new_load

print("Preparing data...")
df = load_and_preprocess_data()
_, _, _, val_dataloader = get_dataloaders(df, batch_size=64)

ckpt_path = "models/tft_best.ckpt"
print(f"Loading checkpoint {ckpt_path}...")
model = TemporalFusionTransformer.load_from_checkpoint(ckpt_path, strict=False)
model.eval()

print("Evaluating...")
raw_preds = model.predict(val_dataloader, mode="raw", return_x=True, trainer_kwargs={"accelerator": "cpu", "logger": False})
preds = raw_preds.output.prediction
actuals = raw_preds.x["decoder_target"]

p50 = preds[:, :, 1].float()
safe_act = torch.where(actuals == 0, torch.tensor(1e-8), actuals.float())
mape = float(torch.mean(torch.abs((actuals.float() - p50) / safe_act)) * 100)
mae  = float(torch.mean(torch.abs(actuals.float() - p50)))
rmse = float(torch.sqrt(torch.mean((actuals.float() - p50) ** 2)))

print(f"\nMAPE: {mape:.2f}% | MAE: {mae:.2f} | RMSE: {rmse:.2f}")

metrics_data = {
    "test_mape": round(mape, 4),
    "test_mae":  round(mae,  4),
    "test_rmse": round(rmse, 4),
    "trained_on": "multi-series 241 groups (36584 rows)",
    "model_type": "TFT",
    "mlflow_run_id": "f73ca9f8fcf04af4aa6fdbd2a581abe5"
}
with open("models/tft_metrics.json", "w") as f:
    json.dump(metrics_data, f, indent=2)
print("Saved models/tft_metrics.json")
