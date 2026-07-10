from __future__ import annotations

from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.exceptions.business import BusinessNotFoundError, InvalidTimezoneError, ValidationAppError
from app.models.business import Business
from app.models.enums import PublicPageVariant
from app.models.subscription import Subscription
from app.repositories.business_repository import BusinessRepository
from app.utils.mini_site_config import (
    merge_mini_site_config_into_settings,
    normalize_mini_site_config,
    read_mini_site_config_from_settings,
)
from app.utils.public_page_variant import resolve_public_page_variant
from app.schemas.business import (
    BusinessAdminRead,
    BusinessSettingsRead,
    BusinessSubscriptionSummary,
    BusinessUpdate,
    PublicBusinessRead,
)
from app.schemas.mini_site import MiniSiteConfig, MiniSiteConfigWrite, MiniSiteTemplate
from app.schemas.mini_site_media import MiniSiteImageMedia, MiniSiteMediaRemoveResponse, MiniSiteMediaUploadResponse
from app.services.mini_site_image_optimizer import optimize_mini_site_image
from app.services.mini_site_media_storage import (
    delete_mini_site_media_files_if_owned,
    extension_for_content_type,
    mini_site_business_upload_dir,
    sanitize_original_filename,
)
from app.utils.mini_site_media_slots import (
    MINI_SITE_IMAGE_MAX_BYTES,
    MINI_SITE_IMAGE_MAX_SIZE_MESSAGE,
    is_allowed_mini_site_image_slot,
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

    async def get_mini_site_config(self, business: Business) -> MiniSiteConfig:
        return read_mini_site_config_from_settings(business.settings)

    async def save_mini_site_config(
        self,
        business: Business,
        payload: MiniSiteConfigWrite,
    ) -> MiniSiteConfig:
        normalized = normalize_mini_site_config(payload.model_dump(exclude_unset=True))
        business.settings = merge_mini_site_config_into_settings(business.settings, normalized)
        flag_modified(business, "settings")
        await self.session.flush()
        await self.session.commit()
        await self.session.refresh(business)
        return read_mini_site_config_from_settings(business.settings)

    async def upload_mini_site_media(
        self,
        business: Business,
        *,
        template: MiniSiteTemplate,
        slot: str,
        content: bytes,
        content_type: str,
        original_filename: str,
        alt: str | None = None,
    ) -> MiniSiteMediaUploadResponse:
        if not is_allowed_mini_site_image_slot(template, slot):
            raise ValidationAppError("Invalid template media slot.")
        if not content:
            raise ValidationAppError("Image file is required.")
        if len(content) > MINI_SITE_IMAGE_MAX_BYTES:
            raise ValidationAppError(MINI_SITE_IMAGE_MAX_SIZE_MESSAGE)

        extension_for_content_type(content_type)
        mini_site_business_upload_dir(business.id)

        config = read_mini_site_config_from_settings(business.settings)
        existing_bucket = config.template_media.get(template, {})
        existing_entry = existing_bucket.get(slot) if isinstance(existing_bucket, dict) else None
        delete_mini_site_media_files_if_owned(
            business.id,
            existing_entry if isinstance(existing_entry, dict) else None,
        )

        optimized = optimize_mini_site_image(business.id, content=content)

        media = MiniSiteImageMedia(
            kind="image",
            url=optimized.web_url,
            thumbnail_url=optimized.thumbnail_url,
            alt=(alt or "").replace("<", "").replace(">", "").strip(),
            filename=sanitize_original_filename(original_filename),
            content_type=optimized.content_type,
            size=optimized.size,
            original_size=optimized.original_size,
            width=optimized.width,
            height=optimized.height,
        )

        template_media = dict(config.template_media)
        bucket = dict(template_media.get(template, {}))
        bucket[slot] = media.model_dump()
        template_media[template] = bucket
        updated = config.model_copy(update={"template_media": template_media})
        business.settings = merge_mini_site_config_into_settings(business.settings, updated)
        flag_modified(business, "settings")
        await self.session.flush()
        await self.session.commit()
        await self.session.refresh(business)

        return MiniSiteMediaUploadResponse(template=template, slot=slot, media=media)

    async def remove_mini_site_media(
        self,
        business: Business,
        *,
        template: MiniSiteTemplate,
        slot: str,
    ) -> MiniSiteMediaRemoveResponse:
        if not is_allowed_mini_site_image_slot(template, slot):
            raise ValidationAppError("Invalid template media slot.")

        config = read_mini_site_config_from_settings(business.settings)
        template_media = dict(config.template_media)
        bucket = dict(template_media.get(template, {}))
        existing_entry = bucket.pop(slot, None)
        delete_mini_site_media_files_if_owned(
            business.id,
            existing_entry if isinstance(existing_entry, dict) else None,
        )

        if bucket:
            template_media[template] = bucket
        else:
            template_media.pop(template, None)

        updated = config.model_copy(update={"template_media": template_media})
        business.settings = merge_mini_site_config_into_settings(business.settings, updated)
        flag_modified(business, "settings")
        await self.session.flush()
        await self.session.commit()
        await self.session.refresh(business)

        return MiniSiteMediaRemoveResponse(template=template, slot=slot, removed=True)

    async def get_public_business(self, slug: str) -> PublicBusinessRead:
        business = await self.repo.get_public_by_slug(slug)
        if business is None:
            raise BusinessNotFoundError()
        subscription = await self.repo.get_subscription(business.id)
        public_page_variant = resolve_public_page_variant(subscription)
        mini_site_config = (
            read_mini_site_config_from_settings(business.settings)
            if public_page_variant == PublicPageVariant.mini_site
            else None
        )
        return PublicBusinessRead(
            id=business.id,
            name=business.name,
            slug=business.slug,
            description=business.description,
            logo_url=business.logo_url,
            operating_mode=business.operating_mode,
            contact_phone=business.contact_phone,
            address=business.address,
            public_page_variant=public_page_variant,
            mini_site_config=mini_site_config,
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
