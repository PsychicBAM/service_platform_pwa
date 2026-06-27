import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.business import get_active_business_by_slug
from app.models.business import Business
from app.models.enums import ServiceType
from app.schemas.booking import PublicBookingCreate, PublicBookingCreateResponse
from app.schemas.business import PublicBusinessRead
from app.schemas.order import PublicOrderCreate, PublicOrderCreateResponse
from app.schemas.schedule import AvailabilityResponse
from app.schemas.service import PublicServiceRead
from app.services.availability_service import AvailabilityService
from app.services.booking_service import BookingService
from app.services.business_service import BusinessService
from app.services.order_service import OrderService
from app.services.service_service import ServiceService

router = APIRouter(prefix="/public/b", tags=["public"])


@router.get("/{slug}", response_model=PublicBusinessRead)
async def get_public_business(
    slug: str,
    business: Business = Depends(get_active_business_by_slug),
    db: AsyncSession = Depends(get_db),
) -> PublicBusinessRead:
    if business.slug != slug.lower():
        raise ValueError("slug mismatch")  # pragma: no cover
    return await BusinessService(db).get_public_business(slug)


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


@router.get("/{slug}/availability", response_model=AvailabilityResponse)
async def get_availability(
    slug: str,
    service_id: uuid.UUID = Query(...),
    date: date = Query(..., alias="date"),
    business: Business = Depends(get_active_business_by_slug),
    db: AsyncSession = Depends(get_db),
) -> AvailabilityResponse:
    if business.slug != slug.lower():
        raise ValueError("slug mismatch")  # pragma: no cover
    return await AvailabilityService(db).get_availability_for_service_id(
        business,
        service_id,
        date,
    )


@router.post(
    "/{slug}/bookings",
    response_model=PublicBookingCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_public_booking(
    slug: str,
    payload: PublicBookingCreate,
    db: AsyncSession = Depends(get_db),
) -> PublicBookingCreateResponse:
    booking, service, client = await BookingService(db).create_public_booking(
        slug,
        payload,
    )
    return PublicBookingCreateResponse.from_entities(booking, service, client)


@router.post(
    "/{slug}/orders",
    response_model=PublicOrderCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_public_order(
    slug: str,
    payload: PublicOrderCreate,
    db: AsyncSession = Depends(get_db),
) -> PublicOrderCreateResponse:
    order, service, client = await OrderService(db).create_public_order(slug, payload)
    return PublicOrderCreateResponse.from_entities(order, service, client)
