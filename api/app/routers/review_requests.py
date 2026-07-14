from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.review import ReviewRead, ReviewRequestContext, ReviewRequestSubmit
from app.services.review_service import ReviewService

router = APIRouter(prefix="/public/reviews/request", tags=["public-review-requests"])


@router.get("/{token}", response_model=ReviewRequestContext)
async def get_review_request_context(
    token: str,
    db: AsyncSession = Depends(get_db),
) -> ReviewRequestContext:
    return await ReviewService(db).get_review_request_context(token)


@router.post(
    "/{token}",
    response_model=ReviewRead,
    status_code=status.HTTP_201_CREATED,
)
async def submit_review_request(
    token: str,
    payload: ReviewRequestSubmit,
    db: AsyncSession = Depends(get_db),
) -> ReviewRead:
    return await ReviewService(db).create_review_from_request_token(token, payload)
