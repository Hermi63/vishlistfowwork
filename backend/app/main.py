import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from starlette.types import ASGIApp, Receive, Scope, Send

from .core.config import settings
from .core.database import Base, engine
from .routers import auth, items, preview, wishlists, ws

logger = logging.getLogger(__name__)

cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]


class CORSAndCOOPMiddleware:
    """
    Custom ASGI middleware that handles CORS and COOP headers manually.

    Replaces Starlette CORSMiddleware to guarantee correct preflight
    handling across all deployment environments (Railway, etc.).
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app
        self.allowed_origins = set(cors_origins)

    def _get_cors_headers(self, origin: str) -> list[tuple[bytes, bytes]]:
        if origin in self.allowed_origins:
            return [
                (b"access-control-allow-origin", origin.encode()),
                (b"access-control-allow-credentials", b"true"),
                (b"cross-origin-opener-policy", b"same-origin-allow-popups"),
                (b"vary", b"Origin"),
            ]
        return [
            (b"cross-origin-opener-policy", b"same-origin-allow-popups"),
            (b"vary", b"Origin"),
        ]

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers", []))
        origin = headers.get(b"origin", b"").decode()
        method = scope.get("method", "")

        # Handle preflight OPTIONS requests
        if method == "OPTIONS" and origin and b"access-control-request-method" in headers:
            logger.info("CORS preflight from origin=%s path=%s", origin, scope.get("path"))
            response_headers = self._get_cors_headers(origin)
            if origin in self.allowed_origins:
                response_headers.extend([
                    (b"access-control-allow-methods", b"GET, POST, PUT, DELETE, OPTIONS, PATCH"),
                    (b"access-control-allow-headers", b"Authorization, Content-Type, Accept, Origin, X-Requested-With"),
                    (b"access-control-max-age", b"600"),
                ])

            await send({
                "type": "http.response.start",
                "status": 200,
                "headers": response_headers,
            })
            await send({
                "type": "http.response.body",
                "body": b"",
            })
            return

        # For normal requests, inject CORS headers into the response
        cors_headers = self._get_cors_headers(origin) if origin else [
            (b"cross-origin-opener-policy", b"same-origin-allow-popups"),
        ]

        async def send_with_cors(message):
            if message["type"] == "http.response.start":
                existing_headers = list(message.get("headers", []))
                existing_headers.extend(cors_headers)
                message = {**message, "headers": existing_headers}
            await send(message)

        await self.app(scope, receive, send_with_cors)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("CORS allowed origins: %s", cors_origins)
    yield


app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

app.add_middleware(CORSAndCOOPMiddleware)

app.include_router(auth.router)
app.include_router(wishlists.router)
app.include_router(items.router)
app.include_router(preview.router)
app.include_router(ws.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "cors_origins": cors_origins}


@app.get("/api/debug-cors")
async def debug_cors():
    return {
        "CORS_ORIGINS_env": os.getenv("CORS_ORIGINS"),
        "CORS_ORIGINS_settings": settings.CORS_ORIGINS,
        "cors_origins_parsed": cors_origins,
    }
