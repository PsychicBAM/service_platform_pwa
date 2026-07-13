import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.business import get_business_for_admin_or_403
from app.models.business import Business
from app.models.enums import WaitlistStatus
from app.schemas.waitlist import (
    WaitlistEntryRead,
    WaitlistListResponse,
    WaitlistPromoteResponse,
    WaitlistStatusUpdate,
)
from app.services.waitlist_service import WaitlistService

router = APIRouter(prefix="/businesses", tags=["waitlist"])


@router.get("/{business_id}/waitlist", response_model=WaitlistListResponse)
async def list_waitlist_entries(
    business_id: uuid.UUID,
    service_id: uuid.UUID | None = Query(default=None),
    status: WaitlistStatus | None = Query(default=None),
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> WaitlistListResponse:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    entries = await WaitlistService(db).list_for_business(
        business,
        service_id=service_id,
        status=status,
    )
    return WaitlistListResponse(data=entries)


@router.patch(
    "/{business_id}/waitlist/{entry_id}",
    response_model=WaitlistEntryRead,
)
async def update_waitlist_entry_status(
    business_id: uuid.UUID,
    entry_id: uuid.UUID,
    payload: WaitlistStatusUpdate,
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> WaitlistEntryRead:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    return await WaitlistService(db).update_status(
        business,
        entry_id,
        payload.status,
    )


@router.post(
    "/{business_id}/waitlist/{entry_id}/promote",
    response_model=WaitlistPromoteResponse,
)
async def promote_waitlist_entry(
    business_id: uuid.UUID,
    entry_id: uuid.UUID,
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> WaitlistPromoteResponse:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    return await WaitlistService(db).promote_to_booking(business, entry_id)
