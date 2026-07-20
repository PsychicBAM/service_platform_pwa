import uuid

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.business import get_business_for_admin_or_403
from app.models.business import Business
from app.models.enums import ServiceType
from app.schemas.service import (
    ServiceCreate,
    ServiceListMeta,
    ServiceListResponse,
    ServiceRead,
    ServiceUpdate,
)
from app.schemas.service_image import ServiceImageRemoveResponse, ServiceImageUploadResponse
from app.schemas.service_slot_capacity_override import (
    ServiceSlotCapacityOverrideCreate,
    ServiceSlotCapacityOverrideListResponse,
    ServiceSlotCapacityOverrideRead,
)
from app.services.service_service import ServiceService
from app.services.service_slot_capacity_override_service import ServiceSlotCapacityOverrideService
from app.utils.service_currency import resolve_service_currency

router = APIRouter(prefix="/businesses", tags=["services"])


def _service_read(business: Business, service) -> ServiceRead:
    return ServiceRead.from_service(
        service,
        display_currency=resolve_service_currency(business.settings),
    )


@router.get("/{business_id}/services", response_model=ServiceListResponse)
async def list_services(
    business_id: uuid.UUID,
    type: ServiceType | None = Query(default=None),
    include_inactive: bool = Query(default=True),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> ServiceListResponse:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    service = ServiceService(db)
    services, total = await service.list_for_business(
        business,
        type=type,
        include_inactive=include_inactive,
        page=page,
        limit=limit,
    )
    return ServiceListResponse(
        data=[_service_read(business, s) for s in services],
        meta=ServiceListMeta(page=page, limit=limit, total=total),
    )


@router.get("/{business_id}/services/{service_id}", response_model=ServiceRead)
async def get_service(
    business_id: uuid.UUID,
    service_id: uuid.UUID,
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> ServiceRead:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    service = await ServiceService(db).get_for_business(business, service_id)
    return _service_read(business, service)


@router.post(
    "/{business_id}/services",
    response_model=ServiceRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_service(
    business_id: uuid.UUID,
    payload: ServiceCreate,
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> ServiceRead:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    service = await ServiceService(db).create(business, payload)
    return _service_read(business, service)


@router.patch("/{business_id}/services/{service_id}", response_model=ServiceRead)
async def update_service(
    business_id: uuid.UUID,
    service_id: uuid.UUID,
    payload: ServiceUpdate,
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> ServiceRead:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    service = await ServiceService(db).update(business, service_id, payload)
    return _service_read(business, service)


@router.delete("/{business_id}/services/{service_id}", response_model=ServiceRead)
async def delete_service(
    business_id: uuid.UUID,
    service_id: uuid.UUID,
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> ServiceRead:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    service = await ServiceService(db).soft_delete(business, service_id)
    return _service_read(business, service)


@router.post(
    "/{business_id}/services/{service_id}/image",
    response_model=ServiceImageUploadResponse,
)
async def upload_service_image(
    business_id: uuid.UUID,
    service_id: uuid.UUID,
    file: UploadFile = File(...),
    alt: str | None = Form(default=None),
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> ServiceImageUploadResponse:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    content = await file.read()
    content_type = file.content_type or ""
    return await ServiceService(db).upload_image(
        business,
        service_id,
        content=content,
        content_type=content_type,
        original_filename=file.filename or "upload",
        alt=alt,
    )


@router.delete(
    "/{business_id}/services/{service_id}/image",
    response_model=ServiceImageRemoveResponse,
)
async def remove_service_image(
    business_id: uuid.UUID,
    service_id: uuid.UUID,
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> ServiceImageRemoveResponse:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    return await ServiceService(db).remove_image(business, service_id)


@router.get(
    "/{business_id}/services/{service_id}/slot-capacity-overrides",
    response_model=ServiceSlotCapacityOverrideListResponse,
)
async def list_slot_capacity_overrides(
    business_id: uuid.UUID,
    service_id: uuid.UUID,
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> ServiceSlotCapacityOverrideListResponse:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    overrides = await ServiceSlotCapacityOverrideService(db).list_for_service(
        business,
        service_id,
    )
    return ServiceSlotCapacityOverrideListResponse(data=overrides)


@router.post(
    "/{business_id}/services/{service_id}/slot-capacity-overrides",
    response_model=ServiceSlotCapacityOverrideRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_slot_capacity_override(
    business_id: uuid.UUID,
    service_id: uuid.UUID,
    payload: ServiceSlotCapacityOverrideCreate,
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> ServiceSlotCapacityOverrideRead:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    return await ServiceSlotCapacityOverrideService(db).create(business, service_id, payload)


@router.delete(
    "/{business_id}/services/{service_id}/slot-capacity-overrides/{override_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_slot_capacity_override(
    business_id: uuid.UUID,
    service_id: uuid.UUID,
    override_id: uuid.UUID,
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> None:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    await ServiceSlotCapacityOverrideService(db).delete(business, service_id, override_id)
