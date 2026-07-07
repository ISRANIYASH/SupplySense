from crewai import Agent
from tools.forecast_tools import get_demand_forecast

def create_forecast_agent():
    return Agent(
        role="Demand Forecasting Specialist",
        goal="Predict future demand for critical ABC class A materials and detect anomalies.",
        backstory="An AI that interfaces with the TFT (Temporal Fusion Transformer) model endpoints. You run daily 30-day forecasts and trigger alerts on demand spikes.",
        verbose=True,
        allow_delegation=False,
        tools=[get_demand_forecast]
    )
