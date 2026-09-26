import json
import urllib.request
import urllib.error

endpoints = [
    "/api/admin/system-health",
    "/api/admin/table-stats",
    "/api/alerts/active",
    "/api/alerts/summary",
    "/api/decisions/log",
    "/api/decisions/summary",
    "/api/explainability/shap-values",
    "/api/explainability/model-info",
    "/api/explainability/decision-trace",
    "/api/forecast/categories",
    "/api/forecast/regions",
    "/api/forecast/model-comparison",
    "/api/market/commodity-prices",
    "/api/market/analysis",
    "/api/market/price-history",
    "/api/market/live-summary",
    "/api/mlops/experiment-runs",
    "/api/mlops/model-registry",
    "/api/mlops/dag-status",
    "/api/risk/overview",
    "/api/risk/matrix-data",
    "/api/risk/critical-alerts",
    "/api/suppliers/all",
    "/api/suppliers/risk-distribution",
    "/api/suppliers/score-breakdown",
    "/api/weather/impact-analysis",
    "/api/weather/seasonal-impact",
]

def get_schema(data):
    if isinstance(data, dict):
        return {k: type(v).__name__ for k, v in data.items()}
    elif isinstance(data, list):
        if len(data) > 0:
            return [get_schema(data[0])]
        else:
            return []
    else:
        return type(data).__name__

results = {}

for ep in endpoints:
    url = f"http://127.0.0.1:8000{ep}"
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            results[ep] = {"status": 200, "schema": get_schema(data)}
    except urllib.error.HTTPError as e:
        results[ep] = {"status": e.code, "error": str(e)}
    except Exception as e:
        results[ep] = {"status": "error", "error": str(e)}

with open("audit_results.json", "w") as f:
    json.dump(results, f, indent=2)

print("Audit complete.")
