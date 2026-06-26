import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.business import get_business_for_admin_or_403
from app.models.business import Business
from app.models.enums import BookingStatus
from app.schemas.booking import (
    AdminBookingCancelRequest,
    AdminBookingListResponse,
    AdminBookingRead,
    AdminBookingUpdate,
)
from app.services.admin_booking_service import AdminBookingService

router = APIRouter(prefix="/businesses", tags=["bookings"])


@router.get("/{business_id}/bookings", response_model=AdminBookingListResponse)
async def list_bookings(
    business_id: uuid.UUID,
    status: BookingStatus | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> AdminBookingListResponse:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    return await AdminBookingService(db).list_admin_bookings(
        business,
        status=status,
        date_from=date_from,
        date_to=date_to,
        search=search,
        page=page,
        limit=limit,
    )


@router.get("/{business_id}/bookings/{booking_id}", response_model=AdminBookingRead)
async def get_booking(
    business_id: uuid.UUID,
    booking_id: uuid.UUID,
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> AdminBookingRead:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    return await AdminBookingService(db).get_admin_booking(business, booking_id)


@router.patch("/{business_id}/bookings/{booking_id}", response_model=AdminBookingRead)
async def update_booking(
    business_id: uuid.UUID,
    booking_id: uuid.UUID,
    payload: AdminBookingUpdate,
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> AdminBookingRead:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    return await AdminBookingService(db).update_admin_booking(
        business,
        booking_id,
        payload,
    )


@router.post("/{business_id}/bookings/{booking_id}/cancel", response_model=AdminBookingRead)
async def cancel_booking(
    business_id: uuid.UUID,
    booking_id: uuid.UUID,
    payload: AdminBookingCancelRequest,
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> AdminBookingRead:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    return await AdminBookingService(db).cancel_admin_booking(
        business,
        booking_id,
        reason=payload.reason,
    )
