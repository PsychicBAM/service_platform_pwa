from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import require_active_user
from app.models.user import User
from app.schemas.claim import (
    ClaimGuestBookingRequest,
    ClaimGuestBookingResponse,
    ClaimGuestOrderRequest,
    ClaimGuestOrderResponse,
)
from app.services.claim_service import ClaimService

router = APIRouter(prefix="/me/claims", tags=["claims"])


@router.post("/bookings", response_model=ClaimGuestBookingResponse)
async def claim_guest_booking(
    payload: ClaimGuestBookingRequest,
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> ClaimGuestBookingResponse:
    return await ClaimService(db).claim_guest_booking(current_user, payload)


@router.post("/orders", response_model=ClaimGuestOrderResponse)
async def claim_guest_order(
    payload: ClaimGuestOrderRequest,
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> ClaimGuestOrderResponse:
    return await ClaimService(db).claim_guest_order(current_user, payload)
