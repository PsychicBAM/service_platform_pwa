import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.business import get_business_for_admin_or_403
from app.models.business import Business
from app.schemas.schedule import (
    ScheduleRead,
    UnavailableTimeCreate,
    UnavailableTimeRead,
    UnavailableTimeUpdate,
    WorkingBreakCreate,
    WorkingBreakRead,
    WorkingBreakUpdate,
    WorkingHourRead,
    WorkingHoursReplaceRequest,
)
from app.services.schedule_service import ScheduleService

router = APIRouter(prefix="/businesses", tags=["schedule"])


@router.get("/{business_id}/schedule", response_model=ScheduleRead)
async def get_schedule(
    business_id: uuid.UUID,
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> ScheduleRead:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    return await ScheduleService(db).get_schedule(business)


@router.put(
    "/{business_id}/schedule/working-hours",
    response_model=list[WorkingHourRead],
)
async def replace_working_hours(
    business_id: uuid.UUID,
    payload: WorkingHoursReplaceRequest,
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> list[WorkingHourRead]:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    rows = await ScheduleService(db).replace_working_hours(business, payload)
    return rows


@router.post(
    "/{business_id}/schedule/breaks",
    response_model=WorkingBreakRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_break(
    business_id: uuid.UUID,
    payload: WorkingBreakCreate,
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> WorkingBreakRead:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    return await ScheduleService(db).create_break(business, payload)


@router.patch(
    "/{business_id}/schedule/breaks/{break_id}",
    response_model=WorkingBreakRead,
)
async def update_break(
    business_id: uuid.UUID,
    break_id: uuid.UUID,
    payload: WorkingBreakUpdate,
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> WorkingBreakRead:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    return await ScheduleService(db).update_break(business, break_id, payload)


@router.delete(
    "/{business_id}/schedule/breaks/{break_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_break(
    business_id: uuid.UUID,
    break_id: uuid.UUID,
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> None:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    await ScheduleService(db).delete_break(business, break_id)


@router.post(
    "/{business_id}/schedule/unavailable-times",
    response_model=UnavailableTimeRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_unavailable_time(
    business_id: uuid.UUID,
    payload: UnavailableTimeCreate,
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> UnavailableTimeRead:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    return await ScheduleService(db).create_unavailable_time(business, payload)


@router.patch(
    "/{business_id}/schedule/unavailable-times/{block_id}",
    response_model=UnavailableTimeRead,
)
async def update_unavailable_time(
    business_id: uuid.UUID,
    block_id: uuid.UUID,
    payload: UnavailableTimeUpdate,
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> UnavailableTimeRead:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    return await ScheduleService(db).update_unavailable_time(
        business,
        block_id,
        payload,
    )


@router.delete(
    "/{business_id}/schedule/unavailable-times/{block_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_unavailable_time(
    business_id: uuid.UUID,
    block_id: uuid.UUID,
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> None:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    await ScheduleService(db).delete_unavailable_time(business, block_id)
