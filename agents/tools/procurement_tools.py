from langchain.tools import tool

@tool("generate_po")
def generate_po(material_id: str, quantity: int) -> str:
    return f"Generated PO for {quantity} of {material_id}. Selected Supplier: SUP-01. Auto-approved."
