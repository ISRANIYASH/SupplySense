from crewai import Agent
from tools.risk_tools import calculate_overall_risk

def create_risk_agent():
    return Agent(
        role="Global Risk Aggregator",
        goal="Aggregate all signals (weather, market, supplier, inventory) to compute an overall risk score.",
        backstory="A central risk evaluator. If risk > 80, you trigger immediate WhatsApp/Email alerts to admins.",
        verbose=True,
        allow_delegation=False,
        tools=[calculate_overall_risk]
    )
