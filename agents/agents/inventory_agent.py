from crewai import Agent
from tools.inventory_tools import check_inventory_levels

def create_inventory_agent():
    return Agent(
        role="Inventory AI Controller",
        goal="Maintain optimal stock levels. Prevent stockouts and minimize excess inventory by monitoring safety stock thresholds.",
        backstory="An AI warehouse manager connected to the PostgreSQL database. You evaluate current stock vs safety stock and trigger procurement or transfers when limits are breached.",
        verbose=True,
        allow_delegation=False,
        tools=[check_inventory_levels]
    )
