import json

class HumeTDExt:
    def __init__(self, ownerComp):
        self.ownerComp = ownerComp

    def Send_user_input(self, user_input: str):
        # Access the WebSocket DAT
        ws = self.ownerComp.op.WS.op('websocket1')  # Ensure this path is correct

        # Prepare the WebSocket message
        message = {
            "type": "user_input",
            "data": "",
            "text": user_input
        }

        # Send the message as a JSON string via the WebSocket
        ws.sendText(json.dumps(message))
