from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.business import ClaimAlreadyLinkedError, ClaimNotFoundOrMismatchError
from app.models.booking import Booking
from app.models.client import Client
from app.models.enums import ClientSource
from app.models.order import Order
from app.models.user import User
from app.repositories.booking_repository import BookingRepository
from app.repositories.client_repository import ClientRepository
from app.repositories.order_repository import OrderRepository
from app.schemas.claim import (
    ClaimGuestBookingRequest,
    ClaimGuestBookingResponse,
    ClaimGuestOrderRequest,
    ClaimGuestOrderResponse,
)
from app.services.client_booking_service import ClientBookingService, _now_utc
from app.services.client_order_service import ClientOrderService


def contact_matches(
    client: Client,
    *,
    email: str | None,
    phone: str | None,
) -> bool:
    checks: list[bool] = []
    if email:
        if client.email and client.email.strip().lower() == email.strip().lower():
            checks.append(True)
        else:
            checks.append(False)
    if phone:
        if client.phone and client.phone.strip() == phone.strip():
            checks.append(True)
        else:
            checks.append(False)
    return any(checks)


class ClaimService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.booking_repo = BookingRepository(session)
        self.order_repo = OrderRepository(session)
        self.client_repo = ClientRepository(session)
        self.client_booking_service = ClientBookingService(session)
        self.client_order_service = ClientOrderService(session)

    async def claim_guest_booking(
        self,
        current_user: User,
        payload: ClaimGuestBookingRequest,
    ) -> ClaimGuestBookingResponse:
        candidates = await self.booking_repo.list_bookings_for_claim_by_reference(
            payload.reference,
        )
        matched = [
            booking
            for booking in candidates
            if booking.business is not None
            and contact_matches(
                booking.client,
                email=payload.email,
                phone=payload.phone,
            )
        ]
        booking, already_linked = self._resolve_claim_target(
            matched,
            current_user=current_user,
        )

        if not already_linked:
            guests = [item for item in matched if item.client.user_id is None]
            for item in guests:
                await self.client_repo.update_client(
                    item.client,
                    {
                        "user_id": current_user.id,
                        "source": ClientSource.registered,
                    },
                )
            await self.session.commit()

        claimed = await self.booking_repo.get_for_user(current_user.id, booking.id)
        if claimed is None:
            raise ClaimNotFoundOrMismatchError()

        return ClaimGuestBookingResponse(
            booking=self.client_booking_service._to_detail(claimed, _now_utc()),
            already_linked=already_linked,
        )

    async def claim_guest_order(
        self,
        current_user: User,
        payload: ClaimGuestOrderRequest,
    ) -> ClaimGuestOrderResponse:
        candidates = await self.order_repo.list_orders_for_claim_by_reference(
            payload.reference,
        )
        matched = [
            order
            for order in candidates
            if order.business is not None
            and contact_matches(
                order.client,
                email=payload.email,
                phone=payload.phone,
            )
        ]
        order, already_linked = self._resolve_claim_target(
            matched,
            current_user=current_user,
        )

        if not already_linked:
            guests = [item for item in matched if item.client.user_id is None]
            for item in guests:
                await self.client_repo.update_client(
                    item.client,
                    {
                        "user_id": current_user.id,
                        "source": ClientSource.registered,
                    },
                )
            await self.session.commit()

        claimed = await self.order_repo.get_for_user(current_user.id, order.id)
        if claimed is None:
            raise ClaimNotFoundOrMismatchError()

        return ClaimGuestOrderResponse(
            order=self.client_order_service._to_detail(claimed),
            already_linked=already_linked,
        )

    def _resolve_claim_target(
        self,
        matched: list[Booking] | list[Order],
        *,
        current_user: User,
    ) -> tuple[Booking | Order, bool]:
        if not matched:
            raise ClaimNotFoundOrMismatchError()

        mine = [item for item in matched if item.client.user_id == current_user.id]
        guests = [item for item in matched if item.client.user_id is None]
        others = [
            item
            for item in matched
            if item.client.user_id is not None and item.client.user_id != current_user.id
        ]

        if guests:
            # Prefer claiming unlinked guest record(s) for this reference + contact.
            return guests[0], False
        if mine:
            return mine[0], True
        if others:
            raise ClaimAlreadyLinkedError()
        raise ClaimNotFoundOrMismatchError()
