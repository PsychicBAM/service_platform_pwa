import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_optional_user
from app.dependencies.business import get_active_business_by_slug
from app.models.business import Business
from app.models.enums import ServiceType
from app.models.user import User
from app.schemas.booking import PublicBookingCreate, PublicBookingCreateResponse
from app.schemas.business import PublicBusinessRead
from app.schemas.order import PublicOrderCreate, PublicOrderCreateResponse
from app.schemas.schedule import AvailabilityResponse
from app.schemas.service import PublicServiceRead
from app.schemas.review import PublicReviewCreate, PublicReviewsResponse, ReviewRead
from app.schemas.waitlist import PublicWaitlistCreate, PublicWaitlistCreateResponse
from app.services.availability_service import AvailabilityService
from app.services.booking_service import BookingService
from app.services.business_service import BusinessService
from app.services.order_service import OrderService
from app.services.service_service import ServiceService
from app.services.waitlist_service import WaitlistService
from app.services.review_service import ReviewService
from app.utils.service_currency import resolve_service_currency

router = APIRouter(prefix="/public/b", tags=["public"])


def _public_service_read(business: Business, service) -> PublicServiceRead:
    return PublicServiceRead.from_service(
        service,
        display_currency=resolve_service_currency(business.settings),
    )


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
    return [_public_service_read(business, s) for s in services]


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
    return _public_service_read(business, service)


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
    current_user: User | None = Depends(get_optional_user),
) -> PublicBookingCreateResponse:
    booking, service, client, linked_to_account = await BookingService(
        db
    ).create_public_booking(
        slug,
        payload,
        current_user=current_user,
    )
    return PublicBookingCreateResponse.from_entities(
        booking,
        service,
        client,
        linked_to_account=linked_to_account if current_user is not None else None,
    )


@router.post(
    "/{slug}/waitlist",
    response_model=PublicWaitlistCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_public_waitlist_entry(
    slug: str,
    payload: PublicWaitlistCreate,
    db: AsyncSession = Depends(get_db),
) -> PublicWaitlistCreateResponse:
    entry = await WaitlistService(db).create_public_waitlist_entry(slug, payload)
    return PublicWaitlistCreateResponse(
        id=entry.id,
        service_id=entry.service_id,
        starts_at=entry.starts_at,
        status=entry.status,
    )


@router.get("/{slug}/reviews", response_model=PublicReviewsResponse)
async def list_public_reviews(
    slug: str,
    db: AsyncSession = Depends(get_db),
) -> PublicReviewsResponse:
    return await ReviewService(db).list_public_reviews(slug, limit=5)


@router.post(
    "/{slug}/reviews",
    response_model=ReviewRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_public_review(
    slug: str,
    payload: PublicReviewCreate,
    db: AsyncSession = Depends(get_db),
) -> ReviewRead:
    return await ReviewService(db).create_public_review(slug, payload)


@router.post(
    "/{slug}/orders",
    response_model=PublicOrderCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_public_order(
    slug: str,
    payload: PublicOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
) -> PublicOrderCreateResponse:
    order, service, client, linked_to_account = await OrderService(db).create_public_order(
        slug,
        payload,
        current_user=current_user,
    )
    return PublicOrderCreateResponse.from_entities(
        order,
        service,
        client,
        linked_to_account=linked_to_account if current_user is not None else None,
    )
