from fastapi import APIRouter, Depends

from ..core.deps import get_current_user
from ..models.models import User
from ..schemas.schemas import LinkPreviewRequest, LinkPreviewResponse
from ..services.link_preview import fetch_link_preview

router = APIRouter(prefix="/api", tags=["preview"])


@router.post("/link-preview", response_model=LinkPreviewResponse)
async def link_preview(
    body: LinkPreviewRequest,
    _user: User = Depends(get_current_user),
):
    """Fetch OpenGraph metadata for a URL. Requires authentication."""
    data = await fetch_link_preview(body.url)
    return LinkPreviewResponse(**data)
