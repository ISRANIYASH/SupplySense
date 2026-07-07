from crewai import Crew, Process, Task
import os

from agents.weather_agent import create_weather_agent
from agents.inventory_agent import create_inventory_agent
from agents.forecast_agent import create_forecast_agent
from agents.market_agent import create_market_agent
from agents.supplier_agent import create_supplier_agent
from agents.risk_agent import create_risk_agent
from agents.procurement_agent import create_procurement_agent
from agents.report_agent import create_report_agent

# Use a mock LLM for the smoke test if API key is missing
os.environ["OPENAI_API_KEY"] = os.environ.get("OPENAI_API_KEY", "sk-mock-key")

def run_supply_chain_crew():
    print("Initializing SupplySense Agents...")
    weather = create_weather_agent()
    inventory = create_inventory_agent()
    forecast = create_forecast_agent()
    market = create_market_agent()
    supplier = create_supplier_agent()
    risk = create_risk_agent()
    procurement = create_procurement_agent()
    report = create_report_agent()

    # Define tasks
    t_weather = Task(description="Check weather for all global warehouses (e.g. Mumbai).", expected_output="Weather report", agent=weather)
    t_inventory = Task(description="Check inventory for MAT-CRITICAL.", expected_output="Inventory status", agent=inventory)
    t_forecast = Task(description="Forecast demand for MAT-CRITICAL.", expected_output="Forecast report", agent=forecast)
    t_market = Task(description="Check commodity prices for Steel.", expected_output="Market report", agent=market)
    t_supplier = Task(description="Check supplier performance for SUP-01.", expected_output="Supplier report", agent=supplier)
    t_risk = Task(description="Aggregate signals to calculate risk.", expected_output="Risk score", agent=risk)
    t_procurement = Task(description="Generate PO if needed.", expected_output="PO confirmation", agent=procurement)
    t_report = Task(description="Generate daily PDF report.", expected_output="Report confirmation", agent=report)

    crew = Crew(
        agents=[weather, inventory, forecast, market, supplier, risk, procurement, report],
        tasks=[t_weather, t_inventory, t_forecast, t_market, t_supplier, t_risk, t_procurement, t_report],
        process=Process.sequential,
        verbose=True
    )
    
    print("Kicking off the CrewAI execution...")
    result = crew.kickoff()
    print("Crew execution finished. Result:", result)
    return result

if __name__ == "__main__":
    run_supply_chain_crew()
