from decimal import Decimal, InvalidOperation

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..core.database import get_db
from ..core.deps import get_current_user, get_optional_user
from ..models.models import (
    Contribution,
    GiftStatus,
    Reservation,
    User,
    Wishlist,
    WishlistItem,
)
from ..schemas.schemas import (
    ContributeRequest,
    ItemCreate,
    ItemUpdate,
    ReserveRequest,
)
from ..services.websocket_manager import manager

router = APIRouter(prefix="/api/wishlists/{slug}/items", tags=["items"])


async def _get_wishlist(slug: str, db) -> Wishlist:
    result = await db.execute(select(Wishlist).where(Wishlist.slug == slug))
    wl = result.scalar_one_or_none()
    if not wl:
        raise HTTPException(status_code=404, detail="Wishlist not found")
    return wl


async def _get_item(item_id: int, db) -> WishlistItem:
    result = await db.execute(
        select(WishlistItem)
        .where(WishlistItem.id == item_id)
        .options(
            selectinload(WishlistItem.reservation),
            selectinload(WishlistItem.contributions),
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.post("/", status_code=status.HTTP_201_CREATED)
async def add_item(
    slug: str,
    body: ItemCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    wl = await _get_wishlist(slug, db)
    if wl.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not the owner")

    item = WishlistItem(wishlist_id=wl.id, **body.model_dump())
    db.add(item)
    await db.flush()
    return {"id": item.id}


@router.put("/{item_id}")
async def update_item(
    slug: str,
    item_id: int,
    body: ItemUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    wl = await _get_wishlist(slug, db)
    if wl.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not the owner")

    item = await _get_item(item_id, db)
    if item.wishlist_id != wl.id:
        raise HTTPException(status_code=404, detail="Item not in this wishlist")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    await db.flush()
    return {"ok": True}


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    slug: str,
    item_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    wl = await _get_wishlist(slug, db)
    if wl.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not the owner")

    item = await _get_item(item_id, db)
    if item.wishlist_id != wl.id:
        raise HTTPException(status_code=404, detail="Item not in this wishlist")
    await db.delete(item)


# ── Reserve ───────────────────────────────────────────────────────────
@router.post("/{item_id}/reserve")
async def reserve_item(
    slug: str,
    item_id: int,
    body: ReserveRequest,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    wl = await _get_wishlist(slug, db)
    item = await _get_item(item_id, db)
    if item.wishlist_id != wl.id:
        raise HTTPException(status_code=404, detail="Item not in this wishlist")

    # Owner cannot reserve own gifts
    if user and user.id == wl.owner_id:
        raise HTTPException(status_code=403, detail="Cannot reserve your own gift")

    if item.status != GiftStatus.AVAILABLE:
        raise HTTPException(status_code=409, detail="Item is not available for reservation")

    reservation = Reservation(
        item_id=item.id,
        reserved_by_name=body.name,
        reserved_by_user_id=user.id if user else None,
    )
    db.add(reservation)
    item.status = GiftStatus.RESERVED
    await db.flush()

    await manager.broadcast(slug, "gift_reserved", {"item_id": item.id})
    return {"ok": True}


@router.delete("/{item_id}/reserve")
async def unreserve_item(
    slug: str,
    item_id: int,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    wl = await _get_wishlist(slug, db)
    item = await _get_item(item_id, db)
    if item.wishlist_id != wl.id:
        raise HTTPException(status_code=404, detail="Item not in this wishlist")

    if not item.reservation:
        raise HTTPException(status_code=404, detail="Not reserved")

    reserved_by = item.reservation.reserved_by_user_id

    if reserved_by is not None:
        # Reservation was made by an authenticated user — only that user can cancel
        if user is None or user.id != reserved_by:
            raise HTTPException(status_code=403, detail="Not your reservation")
    # else: reservation was made anonymously — anyone can cancel (best-effort)

    await db.delete(item.reservation)
    item.status = GiftStatus.AVAILABLE
    await db.flush()

    await manager.broadcast(slug, "gift_unreserved", {"item_id": item.id})
    return {"ok": True}


# ── Contribute ────────────────────────────────────────────────────────
@router.post("/{item_id}/contribute")
async def contribute(
    slug: str,
    item_id: int,
    body: ContributeRequest,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    wl = await _get_wishlist(slug, db)
    item = await _get_item(item_id, db)
    if item.wishlist_id != wl.id:
        raise HTTPException(status_code=404, detail="Item not in this wishlist")

    if user and user.id == wl.owner_id:
        raise HTTPException(status_code=403, detail="Cannot contribute to your own gift")

    if item.status == GiftStatus.RESERVED:
        raise HTTPException(status_code=409, detail="Item is already fully reserved")

    if item.status == GiftStatus.FUNDED:
        raise HTTPException(status_code=409, detail="Item is already fully funded")

    # Amount validated in schema (> 0, reasonable upper bound)
    amount = Decimal(str(body.amount))

    contribution = Contribution(
        item_id=item.id,
        contributor_name=body.name,
        contributor_user_id=user.id if user else None,
        amount=amount,
    )
    db.add(contribution)

    if item.status == GiftStatus.AVAILABLE:
        item.status = GiftStatus.CROWDFUNDING

    # Check if fully funded using Decimal to avoid float rounding errors
    existing_total = sum(Decimal(str(c.amount)) for c in item.contributions)
    total = existing_total + amount
    if item.price and total >= Decimal(str(item.price)):
        item.status = GiftStatus.FUNDED

    await db.flush()

    total_float = float(total)
    await manager.broadcast(
        slug, "contribution_added", {"item_id": item.id, "total": total_float}
    )
    return {"ok": True, "total": total_float}


@router.delete("/{item_id}/contribute/{contribution_id}")
async def remove_contribution(
    slug: str,
    item_id: int,
    contribution_id: int,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    wl = await _get_wishlist(slug, db)
    item = await _get_item(item_id, db)
    if item.wishlist_id != wl.id:
        raise HTTPException(status_code=404, detail="Item not in this wishlist")

    result = await db.execute(
        select(Contribution).where(
            Contribution.id == contribution_id,
            Contribution.item_id == item_id,
        )
    )
    contrib = result.scalar_one_or_none()
    if not contrib:
        raise HTTPException(status_code=404, detail="Contribution not found")

    contrib_by = contrib.contributor_user_id

    if contrib_by is not None:
        # Contribution was made by an authenticated user — only that user can remove it
        if user is None or user.id != contrib_by:
            raise HTTPException(status_code=403, detail="Not your contribution")
    # else: anonymous contribution — anyone can remove (best-effort)

    await db.delete(contrib)

    # Recalculate status using Decimal
    remaining = sum(
        Decimal(str(c.amount))
        for c in item.contributions
        if c.id != contribution_id
    )
    if remaining <= 0:
        item.status = GiftStatus.AVAILABLE
    elif item.price and remaining >= Decimal(str(item.price)):
        item.status = GiftStatus.FUNDED
    else:
        item.status = GiftStatus.CROWDFUNDING

    await db.flush()

    remaining_float = float(remaining)
    await manager.broadcast(
        slug, "contribution_removed", {"item_id": item.id, "total": remaining_float}
    )
    return {"ok": True, "total": remaining_float}
