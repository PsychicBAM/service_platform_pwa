import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.business import get_business_for_admin_or_403
from app.models.business import Business
from app.models.enums import ReviewStatus
from app.schemas.review import AdminReviewStatusUpdate, ReviewRead
from app.services.review_service import ReviewService

router = APIRouter(prefix="/businesses", tags=["reviews"])


@router.get("/{business_id}/reviews", response_model=list[ReviewRead])
async def list_business_reviews(
    business_id: uuid.UUID,
    status_filter: ReviewStatus | None = Query(default=None, alias="status"),
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> list[ReviewRead]:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    return await ReviewService(db).list_admin_reviews(business_id, status=status_filter)


@router.patch(
    "/{business_id}/reviews/{review_id}",
    response_model=ReviewRead,
    status_code=status.HTTP_200_OK,
)
async def update_review_status(
    business_id: uuid.UUID,
    review_id: uuid.UUID,
    payload: AdminReviewStatusUpdate,
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> ReviewRead:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    return await ReviewService(db).update_admin_review_status(business_id, review_id, payload)

