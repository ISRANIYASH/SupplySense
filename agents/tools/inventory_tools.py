from langchain.tools import tool

@tool("check_inventory_levels")
def check_inventory_levels(material_id: str) -> str:
    """
    Checks the current inventory levels for a material and compares it to the safety stock.
    Returns a recommendation to BUY, WAIT, or TRANSFER.
    """
    if material_id == "MAT-CRITICAL":
        return f"Inventory for {material_id} is BELOW safety stock (150 < 200). Action: BUY"
    return f"Inventory for {material_id} is OK. Action: WAIT"
