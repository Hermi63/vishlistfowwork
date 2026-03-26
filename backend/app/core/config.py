import logging
import os

from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)

_INSECURE_DEFAULT = "change-me-in-production-use-a-long-random-string"


class Settings(BaseSettings):
    APP_NAME: str = "WishList API"
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/wishlist"
    SECRET_KEY: str = _INSECURE_DEFAULT
    ALGORITHM: str = "HS256"
    # Безопасность: время жизни токена — 2 часа (вместо 24)
    # Короткое время жизни снижает риск при компрометации токена
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    CORS_ORIGINS: str = "http://localhost:3000"
    GOOGLE_CLIENT_ID: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}

    def __init__(self, **data):
        super().__init__(**data)
        env = os.getenv("APP_ENV", "").lower()
        if self.SECRET_KEY == _INSECURE_DEFAULT and env in ("production", "prod"):
            raise RuntimeError(
                "SECRET_KEY must be changed from the default value in production. "
                "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        if self.SECRET_KEY == _INSECURE_DEFAULT:
            logger.warning(
                "⚠️  Using default SECRET_KEY — set a strong random value via SECRET_KEY env var before deploying."
            )


settings = Settings()
