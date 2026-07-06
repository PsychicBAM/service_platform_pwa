from __future__ import annotations

from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.business import BusinessNotFoundError, InvalidTimezoneError
from app.models.business import Business
from app.models.subscription import Subscription
from app.repositories.business_repository import BusinessRepository
from app.utils.public_page_variant import resolve_public_page_variant
from app.schemas.business import (
    BusinessAdminRead,
    BusinessSettingsRead,
    BusinessSubscriptionSummary,
    BusinessUpdate,
    PublicBusinessRead,
)


class BusinessService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = BusinessRepository(session)

    async def get_admin_business(self, business: Business) -> BusinessAdminRead:
        subscription = await self.repo.get_subscription(business.id)
        return self._to_admin_read(business, subscription)

    async def update_admin_business(
        self,
        business: Business,
        payload: BusinessUpdate,
    ) -> BusinessAdminRead:
        data = payload.model_dump(exclude_unset=True)
        settings_patch = data.pop("settings", None)

        if "timezone" in data:
            self._validate_timezone(data["timezone"])

        if settings_patch is not None:
            await self.repo.update_settings(business, settings_patch)

        if data:
            await self.repo.update_business(business, data)

        await self.session.refresh(business)
        subscription = await self.repo.get_subscription(business.id)
        return self._to_admin_read(business, subscription)

    async def get_public_business(self, slug: str) -> PublicBusinessRead:
        business = await self.repo.get_public_by_slug(slug)
        if business is None:
            raise BusinessNotFoundError()
        subscription = await self.repo.get_subscription(business.id)
        return PublicBusinessRead(
            id=business.id,
            name=business.name,
            slug=business.slug,
            description=business.description,
            logo_url=business.logo_url,
            operating_mode=business.operating_mode,
            contact_phone=business.contact_phone,
            address=business.address,
            public_page_variant=resolve_public_page_variant(subscription),
        )

    @staticmethod
    def _validate_timezone(timezone: str) -> None:
        try:
            ZoneInfo(timezone)
        except (ZoneInfoNotFoundError, KeyError, ValueError):
            raise InvalidTimezoneError(f"Invalid timezone: {timezone}") from None

    @staticmethod
    def _to_admin_read(
        business: Business,
        subscription: Subscription | None,
    ) -> BusinessAdminRead:
        return BusinessAdminRead(
            id=business.id,
            name=business.name,
            slug=business.slug,
            description=business.description,
            logo_url=business.logo_url,
            contact_email=business.contact_email,
            contact_phone=business.contact_phone,
            address=business.address,
            timezone=business.timezone,
            operating_mode=business.operating_mode,
            status=business.status,
            settings=BusinessSettingsRead.from_settings(business.settings),
            subscription=(
                BusinessSubscriptionSummary.model_validate(subscription)
                if subscription is not None
                else None
            ),
            created_at=business.created_at,
            updated_at=business.updated_at,
        )
