from datetime import datetime

from pydantic import BaseModel, EmailStr


# ── Auth ──────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: EmailStr
    name: str
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


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
    title: str
    description: str | None = None
    event_date: datetime | None = None


class WishlistUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
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


# ── Item ──────────────────────────────────────────────────────────────
class ItemCreate(BaseModel):
    title: str
    description: str | None = None
    url: str | None = None
    image_url: str | None = None
    price: float | None = None


class ItemUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    url: str | None = None
    image_url: str | None = None
    price: float | None = None


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
    name: str


class ReservationOut(BaseModel):
    id: int
    reserved_by_name: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Contribution ─────────────────────────────────────────────────────
class ContributeRequest(BaseModel):
    name: str
    amount: float


class ContributionOut(BaseModel):
    id: int
    contributor_name: str
    amount: float
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Link Preview ─────────────────────────────────────────────────────
class LinkPreviewRequest(BaseModel):
    url: str


class LinkPreviewResponse(BaseModel):
    title: str | None = None
    image: str | None = None
    price: str | None = None
    description: str | None = None
