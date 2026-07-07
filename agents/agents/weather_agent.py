from crewai import Agent
from tools.weather_tools import check_weather_risk

def create_weather_agent():
    return Agent(
        role="Weather Intelligence Analyst",
        goal="Monitor global weather patterns across all warehouse and project site regions to identify disruptive events like floods, cyclones, or extreme rainfall.",
        backstory="An expert meteorologist AI integrated with OpenWeatherMap. You analyze precipitation, wind, and alert data to predict supply chain disruptions before they happen.",
        verbose=True,
        allow_delegation=False,
        tools=[check_weather_risk]
    )
