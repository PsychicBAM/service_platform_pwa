from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.business import (
    BusinessNotFoundError,
    NotFoundError,
    ReviewDuplicateError,
    ReviewNotAllowedError,
    ReviewRequestTokenInvalidError,
)
from app.models.booking import Booking
from app.models.order import Order
from app.models.enums import (
    BookingStatus,
    BusinessStatus,
    OrderStatus,
    ReviewStatus,
)
from app.models.review import Review
from app.models.user import User
from app.repositories.booking_repository import BookingRepository
from app.repositories.business_repository import BusinessRepository
from app.repositories.order_repository import OrderRepository
from app.repositories.review_repository import ReviewRepository
from app.schemas.review import (
    AdminReviewStatusUpdate,
    ClientReviewCreate,
    PublicReviewCreate,
    PublicReviewItem,
    PublicReviewSummary,
    PublicReviewsResponse,
    ReviewRead,
    ReviewRequestContext,
    ReviewRequestLinkCreate,
    ReviewRequestLinkResponse,
    ReviewRequestSubmit,
)
from app.services.review_request_token_service import (
    ReviewRequestTokenClaims,
    build_review_request_url,
    create_review_request_token,
    decode_review_request_token,
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


def _display_customer_name(full_name: str) -> str:
    trimmed = full_name.strip()
    if not trimmed:
        return "Customer"
    return trimmed.split()[0]


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

    async def create_user_booking_review(
        self,
        user: User,
        booking_id,
        payload: ClientReviewCreate,
    ) -> ReviewRead:
        booking = await self.booking_repo.get_for_user(user.id, booking_id)
        if booking is None or booking.client is None or booking.service is None:
            raise NotFoundError("Booking not found.")
        if booking.status != BookingStatus.completed:
            raise ReviewNotAllowedError("Only completed bookings can be reviewed.")
        existing = await self.review_repo.get_for_booking_reference(
            booking.business_id,
            booking.reference,
        )
        if existing is not None:
            raise ReviewDuplicateError()
        review = Review(
            business_id=booking.business_id,
            service_id=booking.service_id,
            booking_id=None,
            booking_reference=booking.reference,
            order_id=None,
            order_reference=None,
            customer_name=payload.customer_name or user.full_name,
            rating=payload.rating,
            comment=payload.comment,
            status=ReviewStatus.published,
        )
        review.service = booking.service
        review.booking = booking
        await self.review_repo.create(review)
        await self.session.commit()
        return self._to_read(review)

    async def create_user_order_review(
        self,
        user: User,
        order_id,
        payload: ClientReviewCreate,
    ) -> ReviewRead:
        order = await self.order_repo.get_for_user(user.id, order_id)
        if order is None or order.client is None or order.service is None:
            raise NotFoundError("Order not found.")
        if order.status != OrderStatus.completed:
            raise ReviewNotAllowedError("Only completed orders can be reviewed.")
        existing = await self.review_repo.get_for_order_reference(
            order.business_id,
            order.reference,
        )
        if existing is not None:
            raise ReviewDuplicateError()
        review = Review(
            business_id=order.business_id,
            service_id=order.service_id,
            booking_id=None,
            booking_reference=None,
            order_id=None,
            order_reference=order.reference,
            customer_name=payload.customer_name or user.full_name,
            rating=payload.rating,
            comment=payload.comment,
            status=ReviewStatus.published,
        )
        review.service = order.service
        review.order = order
        await self.review_repo.create(review)
        await self.session.commit()
        return self._to_read(review)

    async def create_review_request_link(
        self,
        business_id: uuid.UUID,
        payload: ReviewRequestLinkCreate,
    ) -> ReviewRequestLinkResponse:
        if payload.booking_id is not None:
            booking = await self.booking_repo.get_detail_for_business(
                business_id,
                payload.booking_id,
            )
            if booking is None or booking.client is None or booking.service is None:
                raise NotFoundError("Booking not found.")
            if booking.status != BookingStatus.completed:
                raise ReviewNotAllowedError("Only completed bookings can receive review links.")
            existing = await self.review_repo.get_for_booking_reference(
                business_id,
                booking.reference,
            )
            if existing is not None:
                raise ReviewDuplicateError("Review already submitted.")
            token, expires_at = create_review_request_token(
                business_id=business_id,
                target_type="booking",
                target_id=booking.id,
            )
            return ReviewRequestLinkResponse(
                review_url=build_review_request_url(token),
                expires_at=expires_at,
            )

        assert payload.order_id is not None
        order = await self.order_repo.get_detail_for_business(business_id, payload.order_id)
        if order is None or order.client is None or order.service is None:
            raise NotFoundError("Order not found.")
        if order.status != OrderStatus.completed:
            raise ReviewNotAllowedError("Only completed orders can receive review links.")
        existing = await self.review_repo.get_for_order_reference(
            business_id,
            order.reference,
        )
        if existing is not None:
            raise ReviewDuplicateError("Review already submitted.")
        token, expires_at = create_review_request_token(
            business_id=business_id,
            target_type="order",
            target_id=order.id,
        )
        return ReviewRequestLinkResponse(
            review_url=build_review_request_url(token),
            expires_at=expires_at,
        )

    async def get_review_request_context(self, token: str) -> ReviewRequestContext:
        claims = decode_review_request_token(token)
        booking, order = await self._load_review_request_target(claims)
        if booking is not None:
            client = booking.client
            service = booking.service
            assert client is not None and service is not None
            business = await self.business_repo.get_by_id(booking.business_id)
            if business is None:
                raise ReviewRequestTokenInvalidError()
            has_review = (
                await self.review_repo.get_for_booking_reference(
                    business.id,
                    booking.reference,
                )
                is not None
            )
            return ReviewRequestContext(
                business_name=business.name,
                service_name=service.name,
                customer_name=_display_customer_name(client.full_name),
                type="booking",
                completed_at=booking.ends_at,
                already_reviewed=has_review,
                expires_at=claims.expires_at,
            )

        assert order is not None
        client = order.client
        service = order.service
        assert client is not None and service is not None
        business = await self.business_repo.get_by_id(order.business_id)
        if business is None:
            raise ReviewRequestTokenInvalidError()
        has_review = (
            await self.review_repo.get_for_order_reference(
                business.id,
                order.reference,
            )
            is not None
        )
        return ReviewRequestContext(
            business_name=business.name,
            service_name=service.name,
            customer_name=_display_customer_name(client.full_name),
            type="order",
            completed_at=order.completed_at,
            already_reviewed=has_review,
            expires_at=claims.expires_at,
        )

    async def create_review_from_request_token(
        self,
        token: str,
        payload: ReviewRequestSubmit,
    ) -> ReviewRead:
        claims = decode_review_request_token(token)
        booking, order = await self._load_review_request_target(claims)
        if booking is not None:
            if booking.status != BookingStatus.completed:
                raise ReviewNotAllowedError("Only completed bookings can be reviewed.")
            existing = await self.review_repo.get_for_booking_reference(
                booking.business_id,
                booking.reference,
            )
            if existing is not None:
                raise ReviewDuplicateError("Review already submitted.")
            return await self._persist_booking_review(
                booking,
                rating=payload.rating,
                comment=payload.comment,
                customer_name=payload.customer_name or booking.client.full_name,
            )

        assert order is not None
        if order.status != OrderStatus.completed:
            raise ReviewNotAllowedError("Only completed orders can be reviewed.")
        existing = await self.review_repo.get_for_order_reference(
            order.business_id,
            order.reference,
        )
        if existing is not None:
            raise ReviewDuplicateError("Review already submitted.")
        return await self._persist_order_review(
            order,
            rating=payload.rating,
            comment=payload.comment,
            customer_name=payload.customer_name or order.client.full_name,
        )

    async def _load_review_request_target(
        self,
        claims: ReviewRequestTokenClaims,
    ) -> tuple[Booking | None, Order | None]:
        if claims.target_type == "booking":
            booking = await self.booking_repo.get_detail_for_business(
                claims.business_id,
                claims.target_id,
            )
            if booking is None or booking.client is None or booking.service is None:
                raise ReviewRequestTokenInvalidError()
            return booking, None

        order = await self.order_repo.get_detail_for_business(
            claims.business_id,
            claims.target_id,
        )
        if order is None or order.client is None or order.service is None:
            raise ReviewRequestTokenInvalidError()
        return None, order

    async def _persist_booking_review(
        self,
        booking: Booking,
        *,
        rating: int,
        comment: str | None,
        customer_name: str,
    ) -> ReviewRead:
        review = Review(
            business_id=booking.business_id,
            service_id=booking.service_id,
            booking_id=None,
            booking_reference=booking.reference,
            order_id=None,
            order_reference=None,
            customer_name=customer_name,
            rating=rating,
            comment=comment,
            status=ReviewStatus.published,
        )
        review.service = booking.service
        review.booking = booking
        await self.review_repo.create(review)
        await self.session.commit()
        return self._to_read(review)

    async def _persist_order_review(
        self,
        order: Order,
        *,
        rating: int,
        comment: str | None,
        customer_name: str,
    ) -> ReviewRead:
        review = Review(
            business_id=order.business_id,
            service_id=order.service_id,
            booking_id=None,
            booking_reference=None,
            order_id=None,
            order_reference=order.reference,
            customer_name=customer_name,
            rating=rating,
            comment=comment,
            status=ReviewStatus.published,
        )
        review.service = order.service
        review.order = order
        await self.review_repo.create(review)
        await self.session.commit()
        return self._to_read(review)

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

