from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from .core.config import settings
from .core.database import Base, engine
from .routers import auth, items, preview, wishlists, ws

# --- Rate limiter ---
# Ограничение запросов по IP для защиты от брутфорса и злоупотреблений
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

# Подключаем rate limiter к приложению
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """Обработчик превышения лимита запросов."""
    return JSONResponse(
        status_code=429,
        content={"detail": "Слишком много запросов. Попробуйте позже."},
    )


cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    # Безопасность: разрешаем только необходимые HTTP-методы вместо "*"
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    # Безопасность: разрешаем только необходимые заголовки вместо "*"
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth.router)
app.include_router(wishlists.router)
app.include_router(items.router)
app.include_router(preview.router)
app.include_router(ws.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
