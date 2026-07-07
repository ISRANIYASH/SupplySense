from langchain.tools import tool

@tool("calculate_overall_risk")
def calculate_overall_risk(signals: str) -> str:
    return f"Aggregated Risk Score: 45/100 based on {signals}. Status: Manageable."
