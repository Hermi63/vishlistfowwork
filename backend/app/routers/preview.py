from fastapi import APIRouter, Depends, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from ..core.deps import get_current_user
from ..models.models import User
from ..schemas.schemas import LinkPreviewRequest, LinkPreviewResponse
from ..services.link_preview import fetch_link_preview

router = APIRouter(prefix="/api", tags=["preview"])

# Rate limiter для preview — предотвращает злоупотребление SSRF-вектором
limiter = Limiter(key_func=get_remote_address)


@router.post("/link-preview", response_model=LinkPreviewResponse)
@limiter.limit("20/minute")
async def link_preview(
    request: Request,
    body: LinkPreviewRequest,
    _user: User = Depends(get_current_user),
):
    """Fetch OpenGraph metadata for a URL. Requires authentication."""
    data = await fetch_link_preview(body.url)
    return LinkPreviewResponse(**data)
