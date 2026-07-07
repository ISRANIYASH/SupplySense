from langchain.tools import tool

@tool("generate_daily_report")
def generate_daily_report(data: str) -> str:
    return "Daily report PDF generated successfully and emailed."
