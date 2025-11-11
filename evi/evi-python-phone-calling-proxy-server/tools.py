# This is a mock function for the ticket status lookup that returns a hardcoded string
# Rewrite it with you custom logic based on this example: https://github.com/HumeAI/hume-api-examples/blob/main/evi/evi-python-function-calling/main.py


async def supportAssistant(ticket_id: str) -> str:
    return f"Ticket with ID {ticket_id} has changed status from Pending to Resolved"
