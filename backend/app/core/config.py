from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "WishList API"
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/wishlist"
    SECRET_KEY: str = "change-me-in-production-use-a-long-random-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    CORS_ORIGINS: str = "http://localhost:3000"
    GOOGLE_CLIENT_ID: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
