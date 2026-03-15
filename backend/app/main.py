from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .core.database import Base, engine
from .routers import auth, items, preview, wishlists, ws


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(wishlists.router)
app.include_router(items.router)
app.include_router(preview.router)
app.include_router(ws.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/debug-cors")
async def debug_cors():
    import os
    return {
        "CORS_ORIGINS_env": os.getenv("CORS_ORIGINS"),
        "CORS_ORIGINS_settings": settings.CORS_ORIGINS,
    }
