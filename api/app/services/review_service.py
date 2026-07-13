from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.business import (
    BusinessNotFoundError,
    NotFoundError,
    ReviewDuplicateError,
    ReviewNotAllowedError,
)
from app.models.enums import (
    BookingStatus,
    BusinessStatus,
    OrderStatus,
    ReviewStatus,
)
from app.models.review import Review
from app.repositories.booking_repository import BookingRepository
from app.repositories.business_repository import BusinessRepository
from app.repositories.order_repository import OrderRepository
from app.repositories.review_repository import ReviewRepository
from app.schemas.review import (
    AdminReviewStatusUpdate,
    PublicReviewCreate,
    PublicReviewItem,
    PublicReviewSummary,
    PublicReviewsResponse,
    ReviewRead,
)


def _contact_matches(email_a: str | None, phone_a: str | None, *, email: str | None, phone: str | None) -> bool:
    checks: list[bool] = []
    if email:
        if email_a and email_a.strip().lower() == email.strip().lower():
            checks.append(True)
        else:
            checks.append(False)
    if phone:
        if phone_a and phone_a.strip() == phone.strip():
            checks.append(True)
        else:
            checks.append(False)
    return any(checks)


class ReviewService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.business_repo = BusinessRepository(session)
        self.booking_repo = BookingRepository(session)
        self.order_repo = OrderRepository(session)
        self.review_repo = ReviewRepository(session)

    async def create_public_review(self, slug: str, payload: PublicReviewCreate) -> ReviewRead:
        business = await self.business_repo.get_by_slug(slug)
        if business is None or business.status != BusinessStatus.active:
            raise BusinessNotFoundError()

        if payload.booking_reference:
            booking = await self.booking_repo.get_for_review_by_reference(
                business.id,
                payload.booking_reference,
            )
            if booking is None or booking.client is None or booking.service is None:
                raise NotFoundError("Booking not found.")
            if booking.status != BookingStatus.completed:
                raise ReviewNotAllowedError("Only completed bookings can be reviewed.")
            if not _contact_matches(
                booking.client.email,
                booking.client.phone,
                email=payload.email,
                phone=payload.phone,
            ):
                raise ReviewNotAllowedError("Review contact does not match booking.")
            existing = await self.review_repo.get_for_booking_reference(
                business.id,
                booking.reference,
            )
            if existing is not None:
                raise ReviewDuplicateError()
            review = Review(
                business_id=business.id,
                service_id=booking.service_id,
                booking_id=None,
                booking_reference=booking.reference,
                order_id=None,
                order_reference=None,
                customer_name=payload.customer_name or booking.client.full_name,
                rating=payload.rating,
                comment=payload.comment,
                status=ReviewStatus.published,
            )
            review.service = booking.service
            review.booking = booking
            await self.review_repo.create(review)
            await self.session.commit()
            return self._to_read(review)

        if payload.order_reference:
            order = await self.order_repo.get_for_review_by_reference(
                business.id,
                payload.order_reference,
            )
            if order is None or order.client is None or order.service is None:
                raise NotFoundError("Order not found.")
            if order.status != OrderStatus.completed:
                raise ReviewNotAllowedError("Only completed orders can be reviewed.")
            if not _contact_matches(
                order.client.email,
                order.client.phone,
                email=payload.email,
                phone=payload.phone,
            ):
                raise ReviewNotAllowedError("Review contact does not match order.")
            existing = await self.review_repo.get_for_order_reference(
                business.id,
                order.reference,
            )
            if existing is not None:
                raise ReviewDuplicateError()
            review = Review(
                business_id=business.id,
                service_id=order.service_id,
                booking_id=None,
                booking_reference=None,
                order_id=None,
                order_reference=order.reference,
                customer_name=payload.customer_name or order.client.full_name,
                rating=payload.rating,
                comment=payload.comment,
                status=ReviewStatus.published,
            )
            review.service = order.service
            review.order = order
            await self.review_repo.create(review)
            await self.session.commit()
            return self._to_read(review)

        raise ReviewNotAllowedError("Invalid review target.")

    async def list_admin_reviews(self, business_id, *, status: ReviewStatus | None = None) -> list[ReviewRead]:
        reviews = await self.review_repo.list_for_business(business_id, status=status, limit=200)
        return [self._to_read(r) for r in reviews]

    async def update_admin_review_status(self, business_id, review_id, payload: AdminReviewStatusUpdate) -> ReviewRead:
        review = await self.review_repo.get_by_id_for_business(business_id, review_id)
        if review is None:
            raise NotFoundError("Review not found.")
        review.status = payload.status
        await self.session.commit()
        await self.session.refresh(review)
        return self._to_read(review)

    async def list_public_reviews(self, slug: str, *, limit: int = 5) -> PublicReviewsResponse:
        business = await self.business_repo.get_by_slug(slug)
        if business is None or business.status != BusinessStatus.active:
            raise BusinessNotFoundError()

        avg, count = await self.review_repo.published_summary(business.id)
        reviews = await self.review_repo.list_recent_published(business.id, limit=limit)
        return PublicReviewsResponse(
            summary=PublicReviewSummary(average_rating=avg, review_count=count),
            reviews=[
                PublicReviewItem(
                    id=r.id,
                    customer_name=r.customer_name,
                    rating=r.rating,
                    comment=r.comment,
                    service_name=r.service.name if r.service else None,
                    created_at=r.created_at,
                )
                for r in reviews
            ],
        )

    @staticmethod
    def _to_read(review: Review) -> ReviewRead:
        service_name = review.service.name if review.service else None
        booking_reference = review.booking_reference or (review.booking.reference if review.booking else None)
        order_reference = review.order_reference or (review.order.reference if review.order else None)
        return ReviewRead(
            id=review.id,
            business_id=review.business_id,
            service_id=review.service_id,
            service_name=service_name,
            booking_id=review.booking_id,
            booking_reference=booking_reference,
            order_id=review.order_id,
            order_reference=order_reference,
            customer_name=review.customer_name,
            rating=int(review.rating),
            comment=review.comment,
            status=review.status,
            created_at=review.created_at,
            updated_at=review.updated_at,
        )

