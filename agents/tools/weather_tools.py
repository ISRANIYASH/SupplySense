from langchain.tools import tool

@tool("check_weather_risk")
def check_weather_risk(location: str) -> str:
    """
    Checks the current weather and 7-day forecast for a given location.
    Returns a weather risk report indicating if rainfall > 50mm or if there is a flood alert.
    """
    # Mock implementation for the smoke test
    if "Mumbai" in location or "Kerala" in location:
        return f"Weather Risk HIGH for {location}: 65mm rainfall expected. Flood alert active."
    return f"Weather Risk LOW for {location}: Clear skies."
