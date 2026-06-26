import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import require_active_user
from app.models.user import User
from app.repositories.booking_repository import UserBookingStatusFilter
from app.schemas.booking import (
    ClientBookingCancelRequest,
    ClientBookingListResponse,
    ClientBookingRescheduleRequest,
    MyBookingDetail,
)
from app.services.client_booking_service import ClientBookingService

router = APIRouter(prefix="/me", tags=["me-bookings"])


@router.get("/bookings", response_model=ClientBookingListResponse)
async def list_my_bookings(
    status: UserBookingStatusFilter | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> ClientBookingListResponse:
    return await ClientBookingService(db).list_my_bookings(
        current_user,
        status_filter=status,
        page=page,
        limit=limit,
    )


@router.get("/bookings/{booking_id}", response_model=MyBookingDetail)
async def get_my_booking(
    booking_id: uuid.UUID,
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> MyBookingDetail:
    return await ClientBookingService(db).get_my_booking(current_user, booking_id)


@router.post("/bookings/{booking_id}/cancel", response_model=MyBookingDetail)
async def cancel_my_booking(
    booking_id: uuid.UUID,
    payload: ClientBookingCancelRequest,
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> MyBookingDetail:
    return await ClientBookingService(db).cancel_my_booking(
        current_user,
        booking_id,
        reason=payload.reason,
    )


@router.post("/bookings/{booking_id}/reschedule", response_model=MyBookingDetail)
async def reschedule_my_booking(
    booking_id: uuid.UUID,
    payload: ClientBookingRescheduleRequest,
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> MyBookingDetail:
    return await ClientBookingService(db).reschedule_my_booking(
        current_user,
        booking_id,
        payload,
    )
