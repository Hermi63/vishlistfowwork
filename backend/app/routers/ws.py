from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from ..core.database import async_session
from ..models.models import Wishlist
from ..services.websocket_manager import manager

router = APIRouter()

# Maximum bytes we read from a client per message (prevent memory abuse)
_MAX_MSG_BYTES = 256


@router.websocket("/ws/{slug}")
async def websocket_endpoint(websocket: WebSocket, slug: str):
    # Verify the wishlist exists and is public before accepting the connection
    async with async_session() as db:
        result = await db.execute(select(Wishlist).where(Wishlist.slug == slug))
        wl = result.scalar_one_or_none()

    if not wl or not wl.is_public:
        await websocket.close(code=4004)
        return

    # Безопасность: проверяем лимит подключений
    connected = await manager.connect(slug, websocket)
    if not connected:
        return
    try:
        while True:
            # Read and silently discard client messages (clients are receive-only)
            data = await websocket.receive_bytes()
            # Hard limit: ignore oversized messages without crashing
            if len(data) > _MAX_MSG_BYTES:
                continue
    except WebSocketDisconnect:
        manager.disconnect(slug, websocket)
    except Exception:
        manager.disconnect(slug, websocket)
