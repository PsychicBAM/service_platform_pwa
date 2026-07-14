from __future__ import annotations

import uuid
from datetime import UTC, date, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.business import (
    InvalidBookingStatusTransitionError,
    NotFoundError,
)
from app.models.booking import Booking
from app.models.business import Business
from app.models.enums import BookingStatus, CancelledBy
from app.repositories.booking_repository import BookingRepository
from app.repositories.review_repository import ReviewRepository
from app.schemas.booking import (
    AdminBookingListItem,
    AdminBookingListMeta,
    AdminBookingListResponse,
    AdminBookingRead,
    AdminBookingUpdate,
)
from app.services.email_notification_service import EmailNotificationService


ALLOWED_STATUS_TRANSITIONS: dict[BookingStatus, set[BookingStatus]] = {
    BookingStatus.pending: {
        BookingStatus.confirmed,
        BookingStatus.cancelled,
    },
    BookingStatus.confirmed: {
        BookingStatus.completed,
        BookingStatus.cancelled,
        BookingStatus.no_show,
    },
}

CANCELLABLE_STATUSES = {
    BookingStatus.pending,
    BookingStatus.pending_payment,
    BookingStatus.confirmed,
}


def validate_status_transition(
    current: BookingStatus,
    new_status: BookingStatus,
) -> None:
    if current == new_status:
        return
    allowed = ALLOWED_STATUS_TRANSITIONS.get(current, set())
    if new_status not in allowed:
        raise InvalidBookingStatusTransitionError(
            f"Cannot transition booking from '{current.value}' to '{new_status.value}'."
        )


class AdminBookingService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = BookingRepository(session)
        self.review_repo = ReviewRepository(session)

    async def list_admin_bookings(
        self,
        business: Business,
        *,
        status: BookingStatus | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        search: str | None = None,
        page: int = 1,
        limit: int = 20,
    ) -> AdminBookingListResponse:
        bookings = await self.repo.list_for_business(
            business.id,
            status=status,
            date_from=date_from,
            date_to=date_to,
            search=search,
            page=page,
            limit=limit,
        )
        total = await self.repo.count_for_business(
            business.id,
            status=status,
            date_from=date_from,
            date_to=date_to,
            search=search,
        )
        reviewed_pairs = await self.review_repo.find_existing_booking_references(
            [(b.business_id, b.reference) for b in bookings],
        )
        return AdminBookingListResponse(
            data=[
                AdminBookingListItem.from_booking(
                    b,
                    has_review=(b.business_id, b.reference) in reviewed_pairs,
                )
                for b in bookings
            ],
            meta=AdminBookingListMeta(page=page, limit=limit, total=total),
        )

    async def get_admin_booking(
        self,
        business: Business,
        booking_id: uuid.UUID,
    ) -> AdminBookingRead:
        booking = await self.repo.get_detail_for_business(business.id, booking_id)
        if booking is None:
            raise NotFoundError("Booking not found.")
        has_review = (
            await self.review_repo.get_for_booking_reference(
                business.id,
                booking.reference,
            )
            is not None
        )
        return AdminBookingRead.from_booking(booking, has_review=has_review)

    async def update_admin_booking(
        self,
        business: Business,
        booking_id: uuid.UUID,
        payload: AdminBookingUpdate,
    ) -> AdminBookingRead:
        booking = await self.repo.get_detail_for_business(business.id, booking_id)
        if booking is None:
            raise NotFoundError("Booking not found.")

        data = payload.model_dump(exclude_unset=True)
        new_status = data.pop("status", None)

        if new_status is not None:
            validate_status_transition(booking.status, new_status)
            data["status"] = new_status
            if new_status == BookingStatus.cancelled:
                data["cancelled_at"] = datetime.now(UTC)
                data["cancelled_by"] = CancelledBy.admin

        if data:
            await self.repo.update_booking(booking, data)

        await self.session.commit()
        booking = await self.repo.get_detail_for_business(business.id, booking_id)
        assert booking is not None
        booking.business = business
        if new_status == BookingStatus.confirmed:
            EmailNotificationService().notify_client_booking_confirmed(
                booking,
                business=business,
            )
        elif new_status == BookingStatus.cancelled:
            EmailNotificationService().notify_client_booking_cancelled(
                booking,
                business=business,
            )
        return AdminBookingRead.from_booking(booking)

    async def cancel_admin_booking(
        self,
        business: Business,
        booking_id: uuid.UUID,
        *,
        reason: str | None,
    ) -> AdminBookingRead:
        booking = await self.repo.get_detail_for_business(business.id, booking_id)
        if booking is None:
            raise NotFoundError("Booking not found.")

        if booking.status not in CANCELLABLE_STATUSES:
            raise InvalidBookingStatusTransitionError(
                f"Cannot cancel booking with status '{booking.status.value}'."
            )

        await self.repo.cancel_booking(
            booking,
            reason=reason,
            cancelled_at=datetime.now(UTC),
        )
        await self.session.commit()
        booking = await self.repo.get_detail_for_business(business.id, booking_id)
        assert booking is not None
        booking.business = business
        EmailNotificationService().notify_client_booking_cancelled(
            booking,
            business=business,
        )
        return AdminBookingRead.from_booking(booking)
