import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.business import Business
from app.models.business_member import BusinessMember
from app.models.enums import (
    BusinessMemberRole,
    BusinessStatus,
    OperatingMode,
    SubscriptionPlan,
    SubscriptionStatus,
)
from app.models.subscription import Subscription

DEFAULT_BUSINESS_SETTINGS: dict[str, Any] = {
    "auto_confirm_bookings": False,
    "cancellation_hours": 24,
    "max_advance_booking_days": 60,
    "min_advance_booking_hours": 2,
    "allow_guest_checkout": True,
    "slot_interval_minutes": 30,
    "booking_buffer_minutes": 0,
    "require_payment_default": False,
    "notification_email_enabled": True,
}


class BusinessRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_slug(self, slug: str) -> Business | None:
        stmt = select(Business).where(Business.slug == slug.lower())
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id(self, business_id: uuid.UUID) -> Business | None:
        stmt = select(Business).where(Business.id == business_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_member(
        self,
        business_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> BusinessMember | None:
        stmt = select(BusinessMember).where(
            BusinessMember.business_id == business_id,
            BusinessMember.user_id == user_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_subscription(self, business_id: uuid.UUID) -> Subscription | None:
        stmt = select(Subscription).where(Subscription.business_id == business_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create_business(
        self,
        *,
        name: str,
        slug: str,
        operating_mode: OperatingMode,
        timezone: str,
        contact_email: str | None = None,
    ) -> Business:
        business = Business(
            name=name,
            slug=slug.lower(),
            operating_mode=operating_mode,
            timezone=timezone,
            status=BusinessStatus.pending_setup,
            settings=dict(DEFAULT_BUSINESS_SETTINGS),
            contact_email=contact_email,
        )
        self.session.add(business)
        await self.session.flush()
        return business

    async def create_member(
        self,
        *,
        business_id: uuid.UUID,
        user_id: uuid.UUID,
        role: BusinessMemberRole = BusinessMemberRole.owner,
    ) -> BusinessMember:
        member = BusinessMember(
            business_id=business_id,
            user_id=user_id,
            role=role,
            joined_at=datetime.now(UTC),
        )
        self.session.add(member)
        await self.session.flush()
        return member

    async def create_subscription(self, *, business_id: uuid.UUID) -> Subscription:
        subscription = Subscription(
            business_id=business_id,
            plan=SubscriptionPlan.free,
            status=SubscriptionStatus.active,
            usage_bookings_count=0,
            usage_orders_count=0,
        )
        self.session.add(subscription)
        await self.session.flush()
        return subscription
