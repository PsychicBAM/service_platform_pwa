import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.business import get_active_business_by_slug
from app.models.business import Business
from app.models.enums import ServiceType
from app.schemas.service import PublicServiceRead
from app.services.service_service import ServiceService

router = APIRouter(prefix="/public/b", tags=["public"])


@router.get("/{slug}/services", response_model=list[PublicServiceRead])
async def list_public_services(
    slug: str,
    type: ServiceType | None = Query(default=None),
    business: Business = Depends(get_active_business_by_slug),
    db: AsyncSession = Depends(get_db),
) -> list[PublicServiceRead]:
    if business.slug != slug.lower():
        raise ValueError("slug mismatch")  # pragma: no cover
    services = await ServiceService(db).list_public(business, type=type)
    return [PublicServiceRead.from_service(s) for s in services]


@router.get("/{slug}/services/{service_id}", response_model=PublicServiceRead)
async def get_public_service(
    slug: str,
    service_id: uuid.UUID,
    business: Business = Depends(get_active_business_by_slug),
    db: AsyncSession = Depends(get_db),
) -> PublicServiceRead:
    if business.slug != slug.lower():
        raise ValueError("slug mismatch")  # pragma: no cover
    service = await ServiceService(db).get_public(business, service_id)
    return PublicServiceRead.from_service(service)
