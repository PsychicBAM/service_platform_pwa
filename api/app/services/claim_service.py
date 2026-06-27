from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.business import ClaimNotFoundOrMismatchError
from app.models.client import Client
from app.models.enums import ClientSource
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
        booking = await self.booking_repo.get_guest_booking_for_claim(payload.reference)
        if booking is None or booking.business is None:
            raise ClaimNotFoundOrMismatchError()
        if not contact_matches(
            booking.client,
            email=payload.email,
            phone=payload.phone,
        ):
            raise ClaimNotFoundOrMismatchError()

        await self.client_repo.update_client(
            booking.client,
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
        )

    async def claim_guest_order(
        self,
        current_user: User,
        payload: ClaimGuestOrderRequest,
    ) -> ClaimGuestOrderResponse:
        order = await self.order_repo.get_guest_order_for_claim(payload.reference)
        if order is None or order.business is None:
            raise ClaimNotFoundOrMismatchError()
        if not contact_matches(
            order.client,
            email=payload.email,
            phone=payload.phone,
        ):
            raise ClaimNotFoundOrMismatchError()

        await self.client_repo.update_client(
            order.client,
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
        )
