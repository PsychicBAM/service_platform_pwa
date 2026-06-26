import uuid

from fastapi import APIRouter, Depends, Query, status
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
from app.services.service_service import ServiceService

router = APIRouter(prefix="/businesses", tags=["services"])


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
        data=[ServiceRead.from_service(s) for s in services],
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
    return ServiceRead.from_service(service)


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
    return ServiceRead.from_service(service)


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
    return ServiceRead.from_service(service)


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
    return ServiceRead.from_service(service)
