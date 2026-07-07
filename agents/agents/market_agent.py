from crewai import Agent
from tools.market_tools import check_market_prices

def create_market_agent():
    return Agent(
        role="Commodity Market Analyst",
        goal="Track commodity prices and identify optimal buying windows.",
        backstory="An AI connected to AlphaVantage. You watch price trends for raw materials and alert when prices hit All-Time Lows (ATL).",
        verbose=True,
        allow_delegation=False,
        tools=[check_market_prices]
    )
