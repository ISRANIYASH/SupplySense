from celery import Celery
from crew import run_supply_chain_crew

app = Celery('supply_chain_tasks', broker='redis://redis:6379/0')

@app.task
def execute_hourly_crew():
    """
    This task is triggered by Celery beat every hour to run the Agent crew.
    """
    run_supply_chain_crew()
    return "Crew execution triggered."
