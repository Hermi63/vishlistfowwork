from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, EmailStr, Field, field_validator


# ── Auth ──────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    id: int
    email: str
    name: str

    model_config = {"from_attributes": True}


# ── Wishlist ──────────────────────────────────────────────────────────
class WishlistCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    event_date: datetime | None = None


class WishlistUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    event_date: datetime | None = None
    is_public: bool | None = None


class WishlistOut(BaseModel):
    id: int
    title: str
    description: str | None
    event_date: datetime | None
    slug: str
    is_public: bool
    created_at: datetime
    owner: UserOut
    items: list["ItemOut"] = []

    model_config = {"from_attributes": True}


class WishlistListOut(BaseModel):
    id: int
    title: str
    description: str | None
    event_date: datetime | None
    slug: str
    is_public: bool
    created_at: datetime
    item_count: int = 0

    model_config = {"from_attributes": True}


def _validate_safe_url(v: str | None) -> str | None:
    """Allow only http/https URLs to prevent javascript: and data: injection."""
    if v is None:
        return v
    lower = v.lower().lstrip()
    if not (lower.startswith("http://") or lower.startswith("https://")):
        raise ValueError("URL must start with http:// or https://")
    return v


# ── Item ──────────────────────────────────────────────────────────────
class ItemCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    description: str | None = Field(default=None, max_length=2000)
    url: str | None = Field(default=None, max_length=2048)
    image_url: str | None = Field(default=None, max_length=2048)
    price: float | None = Field(default=None, gt=0, le=1_000_000_000)

    _validate_url = field_validator("url", "image_url", mode="before")(_validate_safe_url)


class ItemUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    description: str | None = Field(default=None, max_length=2000)
    url: str | None = Field(default=None, max_length=2048)
    image_url: str | None = Field(default=None, max_length=2048)
    price: float | None = Field(default=None, gt=0, le=1_000_000_000)

    _validate_url = field_validator("url", "image_url", mode="before")(_validate_safe_url)


class ItemOut(BaseModel):
    id: int
    title: str
    description: str | None
    url: str | None
    image_url: str | None
    price: float | None
    status: str
    created_at: datetime
    # These are visible only to non-owners
    reservation: "ReservationOut | None" = None
    contributions: list["ContributionOut"] = []
    total_contributed: float = 0

    model_config = {"from_attributes": True}


# ── Reservation ───────────────────────────────────────────────────────
class ReserveRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class ReservationOut(BaseModel):
    id: int
    reserved_by_name: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Contribution ─────────────────────────────────────────────────────
class ContributeRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    amount: float = Field(gt=0, le=1_000_000_000)


class ContributionOut(BaseModel):
    id: int
    contributor_name: str
    amount: float
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Link Preview ─────────────────────────────────────────────────────
class LinkPreviewRequest(BaseModel):
    url: str = Field(min_length=1, max_length=2048)

    # Безопасность: валидация протокола URL для предотвращения SSRF через javascript:/data: схемы
    _validate_url = field_validator("url", mode="before")(_validate_safe_url)


class LinkPreviewResponse(BaseModel):
    title: str | None = None
    image: str | None = None
    price: str | None = None
    description: str | None = None
