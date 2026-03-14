import json
from collections import defaultdict

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self._connections: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, wishlist_slug: str, websocket: WebSocket):
        await websocket.accept()
        self._connections[wishlist_slug].append(websocket)

    def disconnect(self, wishlist_slug: str, websocket: WebSocket):
        self._connections[wishlist_slug].remove(websocket)
        if not self._connections[wishlist_slug]:
            del self._connections[wishlist_slug]

    async def broadcast(self, wishlist_slug: str, event: str, data: dict):
        message = json.dumps({"event": event, "data": data})
        dead = []
        for ws in self._connections.get(wishlist_slug, []):
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            try:
                self._connections[wishlist_slug].remove(ws)
            except ValueError:
                pass


manager = ConnectionManager()
