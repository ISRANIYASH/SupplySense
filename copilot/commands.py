import json

def handle_special_command(query: str):
    """
    Parses special copilot commands.
    """
    query_lower = query.lower()
    
    if query_lower.startswith("generate report"):
        report_type = query.replace("generate report", "").strip()
        return {"action": "trigger_report_agent", "type": report_type, "response": "Generating report. I will send you the PDF download URL shortly."}
        
    if query_lower.startswith("show chart"):
        chart_query = query.replace("show chart", "").strip()
        # Mocking a Chart.js JSON config
        chart_config = {
            "type": "bar",
            "data": {
                "labels": ["Jan", "Feb", "Mar"],
                "datasets": [{"label": chart_query, "data": [10, 20, 30]}]
            }
        }
        return {"action": "render_chart", "config": chart_config, "response": f"Here is the chart for {chart_query}"}
        
    if query_lower.startswith("what if"):
        scenario = query.replace("what if", "").strip()
        return {"action": "route_to_simulator", "scenario": scenario, "response": "Routing your scenario to the Simulator Engine..."}
        
    if query_lower.startswith("alert me when"):
        condition = query.replace("alert me when", "").strip()
        return {"action": "create_alert_rule", "condition": condition, "response": f"Alert rule created for: {condition}"}

    return {"action": "rag_query", "query": query}
