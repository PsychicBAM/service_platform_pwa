from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.business import PublicBusinessDirectoryResponse
from app.services.business_service import BusinessService

router = APIRouter(prefix="/public/businesses", tags=["public-directory"])

DirectorySort = Literal["popular", "rating", "newest", "name"]


@router.get("", response_model=PublicBusinessDirectoryResponse)
async def list_public_businesses(
    q: str | None = Query(default=None, min_length=1, max_length=120),
    location: str | None = Query(default=None, min_length=1, max_length=120),
    category: str | None = Query(default=None, max_length=64),
    rating_min: float | None = Query(default=None, ge=1, le=5),
    sort: DirectorySort = Query(default="popular"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=12, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
) -> PublicBusinessDirectoryResponse:
    return await BusinessService(db).list_public_directory(
        q=q,
        location=location,
        category=category,
        rating_min=rating_min,
        sort=sort,
        page=page,
        limit=limit,
    )
