from crewai import Agent
from tools.supplier_tools import check_supplier_performance

def create_supplier_agent():
    return Agent(
        role="Supplier Risk Manager",
        goal="Monitor supplier delivery times and flag frequent delays.",
        backstory="You analyze PO histories to detect patterns of delays and recommend alternate suppliers if someone is unreliable.",
        verbose=True,
        allow_delegation=False,
        tools=[check_supplier_performance]
    )
