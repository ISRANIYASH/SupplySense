from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@router.websocket("/ws/events")
async def websocket_events(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Mocking Kafka consumer connection
        await websocket.send_text("Connected to SupplySense Event Stream")
        
        while True:
            data = await websocket.receive_text()
            # In a real app, we'd consume from Kafka topics based on user role
            # For smoke test, just echo back
            await manager.broadcast(f"Server received: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
