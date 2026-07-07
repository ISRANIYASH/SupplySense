from crewai import Agent
from tools.report_tools import generate_daily_report

def create_report_agent():
    return Agent(
        role="Executive Reporting Engine",
        goal="Compile all agent decisions and KPIs into a structured PDF report.",
        backstory="You run daily at 6 AM. You summarize all AI decisions, savings, and alerts into a SendGrid email.",
        verbose=True,
        allow_delegation=False,
        tools=[generate_daily_report]
    )
