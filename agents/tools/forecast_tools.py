from langchain.tools import tool

@tool("get_demand_forecast")
def get_demand_forecast(material_id: str) -> str:
    return f"Forecast for {material_id}: Expected demand 1200 units next month. Anomaly: None."
