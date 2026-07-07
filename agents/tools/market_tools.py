from langchain.tools import tool

@tool("check_market_prices")
def check_market_prices(commodity: str) -> str:
    return f"Market Price for {commodity}: Down 3% today. Close to ATL."
