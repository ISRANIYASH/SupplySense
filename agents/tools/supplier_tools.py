from langchain.tools import tool

@tool("check_supplier_performance")
def check_supplier_performance(supplier_id: str) -> str:
    return f"Supplier {supplier_id}: 1 delay in the last 30 days. Risk: LOW."
