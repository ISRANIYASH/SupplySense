from crewai import Agent
from tools.procurement_tools import generate_po

def create_procurement_agent():
    return Agent(
        role="Procurement Optimizer",
        goal="Run OR-Tools optimization to select the best supplier and generate a Purchase Order.",
        backstory="When triggered, you evaluate the top 3 suppliers and minimize cost/lead-time. If cost < threshold, you auto-approve.",
        verbose=True,
        allow_delegation=False,
        tools=[generate_po]
    )
