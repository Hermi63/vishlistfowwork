from fastapi import APIRouter, Depends, HTTPException, status
from slugify import slugify
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..core.database import get_db
from ..core.deps import get_current_user, get_optional_user
from ..models.models import Contribution, User, Wishlist, WishlistItem
from ..schemas.schemas import (
    ItemOut,
    WishlistCreate,
    WishlistListOut,
    WishlistOut,
    WishlistUpdate,
)

router = APIRouter(prefix="/api/wishlists", tags=["wishlists"])


def _make_slug(title: str, user_id: int) -> str:
    base = slugify(title, max_length=50)
    return f"{base}-{user_id}"


def _serialize_item(item: WishlistItem, is_owner: bool) -> dict:
    total = sum(float(c.amount) for c in item.contributions)
    data = {
        "id": item.id,
        "title": item.title,
        "description": item.description,
        "url": item.url,
        "image_url": item.image_url,
        "price": float(item.price) if item.price is not None else None,
        "status": item.status.value if hasattr(item.status, "value") else item.status,
        "created_at": item.created_at.isoformat(),
        "total_contributed": total,
    }
    if is_owner:
        data["reservation"] = None
        data["contributions"] = []
    else:
        data["reservation"] = (
            {
                "id": item.reservation.id,
                "reserved_by_name": item.reservation.reserved_by_name,
                "created_at": item.reservation.created_at.isoformat(),
            }
            if item.reservation
            else None
        )
        data["contributions"] = [
            {
                "id": c.id,
                "contributor_name": c.contributor_name,
                "amount": float(c.amount),
                "created_at": c.created_at.isoformat(),
            }
            for c in item.contributions
        ]
    return data


@router.get("/my", response_model=list[WishlistListOut])
async def my_wishlists(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Wishlist, func.count(WishlistItem.id).label("item_count"))
        .outerjoin(WishlistItem)
        .where(Wishlist.owner_id == user.id)
        .group_by(Wishlist.id)
        .order_by(Wishlist.created_at.desc())
    )
    rows = result.all()
    return [
        WishlistListOut(
            id=wl.id,
            title=wl.title,
            description=wl.description,
            event_date=wl.event_date,
            slug=wl.slug,
            is_public=wl.is_public,
            created_at=wl.created_at,
            item_count=count,
        )
        for wl, count in rows
    ]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_wishlist(
    body: WishlistCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    slug = _make_slug(body.title, user.id)
    # Ensure unique slug
    existing = await db.execute(select(Wishlist).where(Wishlist.slug == slug))
    if existing.scalar_one_or_none():
        import time
        slug = f"{slug}-{int(time.time()) % 10000}"

    wl = Wishlist(
        owner_id=user.id,
        title=body.title,
        description=body.description,
        event_date=body.event_date,
        slug=slug,
    )
    db.add(wl)
    await db.flush()
    return {"id": wl.id, "slug": wl.slug}


@router.get("/{slug}")
async def get_wishlist(
    slug: str,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Wishlist)
        .where(Wishlist.slug == slug)
        .options(
            selectinload(Wishlist.owner),
            selectinload(Wishlist.items).selectinload(WishlistItem.reservation),
            selectinload(Wishlist.items).selectinload(WishlistItem.contributions),
        )
    )
    wl = result.scalar_one_or_none()
    if not wl:
        raise HTTPException(status_code=404, detail="Wishlist not found")

    is_owner = user is not None and user.id == wl.owner_id

    return {
        "id": wl.id,
        "title": wl.title,
        "description": wl.description,
        "event_date": wl.event_date.isoformat() if wl.event_date else None,
        "slug": wl.slug,
        "is_public": wl.is_public,
        "created_at": wl.created_at.isoformat(),
        "is_owner": is_owner,
        "owner": {"id": wl.owner.id, "name": wl.owner.name, "email": wl.owner.email},
        "items": [_serialize_item(item, is_owner) for item in wl.items],
    }


@router.put("/{slug}")
async def update_wishlist(
    slug: str,
    body: WishlistUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Wishlist).where(Wishlist.slug == slug))
    wl = result.scalar_one_or_none()
    if not wl:
        raise HTTPException(status_code=404, detail="Wishlist not found")
    if wl.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not the owner")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(wl, field, value)
    await db.flush()
    return {"ok": True}


@router.delete("/{slug}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_wishlist(
    slug: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Wishlist).where(Wishlist.slug == slug))
    wl = result.scalar_one_or_none()
    if not wl:
        raise HTTPException(status_code=404, detail="Wishlist not found")
    if wl.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not the owner")
    await db.delete(wl)
