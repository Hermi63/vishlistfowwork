from fastapi import APIRouter

from ..schemas.schemas import LinkPreviewRequest, LinkPreviewResponse
from ..services.link_preview import fetch_link_preview

router = APIRouter(prefix="/api", tags=["preview"])


@router.post("/link-preview", response_model=LinkPreviewResponse)
async def link_preview(body: LinkPreviewRequest):
    data = await fetch_link_preview(body.url)
    return LinkPreviewResponse(**data)
