from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.business import (
    NotFoundError,
    OrdersDisabledError,
    ServiceNotOrderableError,
)
from app.models.client import Client
from app.models.enums import BusinessStatus, OperatingMode, OrderStatus, ServiceType
from app.models.order import Order
from app.models.service import Service
from app.repositories.business_repository import BusinessRepository
from app.repositories.client_repository import ClientRepository
from app.repositories.order_repository import OrderRepository
from app.repositories.service_repository import ServiceRepository
from app.schemas.order import PublicOrderCreate
from app.utils.references import generate_order_reference


class OrderService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.business_repo = BusinessRepository(session)
        self.service_repo = ServiceRepository(session)
        self.client_repo = ClientRepository(session)
        self.order_repo = OrderRepository(session)

    async def create_public_order(
        self,
        business_slug: str,
        payload: PublicOrderCreate,
    ) -> tuple[Order, Service, Client]:
        business = await self.business_repo.get_by_slug(business_slug)
        if business is None or business.status != BusinessStatus.active:
            raise NotFoundError("Business not found.")

        if business.operating_mode == OperatingMode.booking_only:
            raise OrdersDisabledError()

        service = await self.service_repo.get_by_business_and_id(
            business.id,
            payload.service_id,
        )
        if service is None or not service.is_active:
            raise NotFoundError("Service not found.")
        if service.type != ServiceType.order:
            raise ServiceNotOrderableError("Only order services can be ordered.")

        client = await self.client_repo.get_or_create_guest_client(
            business.id,
            full_name=payload.client.full_name,
            email=payload.client.email,
            phone=payload.client.phone,
        )

        year = datetime.now(UTC).year
        reference = await generate_order_reference(self.session, business.id, year)

        # TODO: set payment_required and start payment flow in Phase 4 when require_payment is true.
        order = Order(
            business_id=business.id,
            service_id=service.id,
            client_id=client.id,
            reference=reference,
            status=OrderStatus.submitted,
            form_data=payload.form_data,
            quoted_price_cents=None,
        )
        await self.order_repo.create(order)
        await self.session.commit()
        await self.session.refresh(order)
        return order, service, client
