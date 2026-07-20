import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.business import (
    ForbiddenError,
    NotFoundError,
    PlanLimitExceededError,
    ValidationAppError,
)
from app.models.business import Business
from app.models.enums import (
    BusinessMemberRole,
    BusinessStatus,
    OperatingMode,
    PriceType,
    ServiceType,
    SubscriptionPlan,
    UserRole,
)
from app.models.service import Service
from app.models.user import User
from app.repositories.business_repository import BusinessRepository
from app.schemas.service import ServiceCreate, ServiceUpdate
from app.schemas.service_image import (
    ServiceImageMedia,
    ServiceImageRemoveResponse,
    ServiceImageUploadResponse,
)
from app.services.service_image_optimizer import optimize_service_image
from app.services.service_image_storage import (
    delete_service_image_files_if_owned,
    extension_for_content_type,
    sanitize_original_filename,
    service_upload_dir,
)
from app.utils.service_image import SERVICE_IMAGE_MAX_BYTES, SERVICE_IMAGE_MAX_SIZE_MESSAGE

FREE_PLAN_MAX_SERVICES = 3

_ADMIN_MEMBER_ROLES = {
    BusinessMemberRole.owner,
    BusinessMemberRole.admin,
    BusinessMemberRole.staff,
}


def allowed_types_for_operating_mode(mode: OperatingMode) -> set[ServiceType]:
    if mode == OperatingMode.booking_only:
        return {ServiceType.booking}
    if mode == OperatingMode.orders_only:
        return {ServiceType.order}
    return {ServiceType.booking, ServiceType.order}


class BusinessAccessService:
    def __init__(self, session: AsyncSession) -> None:
        self.repo = BusinessRepository(session)

    async def get_business_for_admin_or_403(
        self,
        business_id: uuid.UUID,
        current_user: User,
    ) -> Business:
        business = await self.repo.get_by_id(business_id)
        if business is None:
            raise NotFoundError("Business not found.")

        if business.status == BusinessStatus.suspended:
            raise ForbiddenError("Business is suspended.")

        if current_user.role == UserRole.superadmin:
            return business

        member = await self.repo.get_member(business_id, current_user.id)
        # TODO: refine staff permissions when role capabilities are defined.
        if member is None or member.role not in _ADMIN_MEMBER_ROLES:
            raise ForbiddenError("You do not have access to this business.")

        return business


class ServiceService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.business_repo = BusinessRepository(session)
        from app.repositories.service_repository import ServiceRepository

        self.repo = ServiceRepository(session)

    async def list_for_business(
        self,
        business: Business,
        *,
        type: ServiceType | None = None,
        include_inactive: bool = True,
        page: int = 1,
        limit: int = 50,
    ) -> tuple[list[Service], int]:
        services = await self.repo.list_for_business(
            business.id,
            type=type,
            include_inactive=include_inactive,
            page=page,
            limit=limit,
        )
        total = await self.repo.count_for_business(
            business.id,
            type=type,
            include_inactive=include_inactive,
        )
        return services, total

    async def get_for_business(
        self,
        business: Business,
        service_id: uuid.UUID,
    ) -> Service:
        service = await self.repo.get_by_business_and_id(business.id, service_id)
        if service is None:
            raise NotFoundError("Service not found.")
        return service

    async def create(
        self,
        business: Business,
        payload: ServiceCreate,
    ) -> Service:
        await self._enforce_free_plan_limit(business.id)
        self._validate_type_for_operating_mode(business, payload.type)
        self._validate_required_category(business, payload.category)
        duration = self._resolve_duration(payload.type, payload.duration_minutes)
        self._validate_price(payload.price_type, payload.price_cents)

        from app.utils.service_currency import resolve_service_currency

        # Business Settings → Services currency is the global source of truth.
        currency = resolve_service_currency(business.settings)

        service = Service(
            business_id=business.id,
            name=payload.name,
            description=payload.description,
            category=payload.category,
            type=payload.type,
            duration_minutes=duration,
            price_cents=payload.price_cents,
            currency=currency,
            price_type=payload.price_type,
            require_payment=payload.require_payment,
            is_active=payload.is_active,
            sort_order=payload.sort_order,
            capacity=payload.capacity if payload.type == ServiceType.booking else 1,
            booking_min_notice_minutes=(
                payload.booking_min_notice_minutes
                if payload.type == ServiceType.booking
                else 0
            ),
            booking_window_days=(
                payload.booking_window_days if payload.type == ServiceType.booking else None
            ),
            waitlist_enabled=(
                payload.waitlist_enabled if payload.type == ServiceType.booking else False
            ),
            metadata_=payload.metadata,
        )
        await self.repo.create(service)
        await self.session.commit()
        await self.session.refresh(service)
        return service

    async def update(
        self,
        business: Business,
        service_id: uuid.UUID,
        payload: ServiceUpdate,
    ) -> Service:
        service = await self.get_for_business(business, service_id)
        data = payload.model_dump(exclude_unset=True)

        if "metadata" in data:
            data["metadata_"] = data.pop("metadata")

        if service.type == ServiceType.order:
            data["duration_minutes"] = None
            data.pop("capacity", None)
            data.pop("booking_min_notice_minutes", None)
            data.pop("booking_window_days", None)
            data.pop("waitlist_enabled", None)
        elif "duration_minutes" in data and data["duration_minutes"] is None:
            raise ValidationAppError(
                "duration_minutes is required for booking services"
            )

        price_type = data.get("price_type", service.price_type)
        price_cents = data.get("price_cents", service.price_cents)
        self._validate_price(price_type, price_cents)

        next_category = data["category"] if "category" in data else service.category
        self._validate_required_category(business, next_category)

        from app.utils.service_currency import resolve_service_currency

        data["currency"] = resolve_service_currency(business.settings)

        await self.repo.update(service, data)
        await self.session.commit()
        await self.session.refresh(service)
        return service

    async def soft_delete(
        self,
        business: Business,
        service_id: uuid.UUID,
    ) -> Service:
        service = await self.get_for_business(business, service_id)
        await self.repo.soft_deactivate(service)
        await self.session.commit()
        await self.session.refresh(service)
        return service

    async def upload_image(
        self,
        business: Business,
        service_id: uuid.UUID,
        *,
        content: bytes,
        content_type: str,
        original_filename: str,
        alt: str | None = None,
    ) -> ServiceImageUploadResponse:
        service = await self.get_for_business(business, service_id)
        if not content:
            raise ValidationAppError("Image file is required.")
        if len(content) > SERVICE_IMAGE_MAX_BYTES:
            raise ValidationAppError(SERVICE_IMAGE_MAX_SIZE_MESSAGE)

        extension_for_content_type(content_type)
        service_upload_dir(business.id, service.id)

        delete_service_image_files_if_owned(business.id, service.id, service.image_)

        optimized = optimize_service_image(
            business.id,
            service.id,
            content=content,
        )

        image = ServiceImageMedia(
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

        await self.repo.update(service, {"image_": image.model_dump()})
        await self.session.commit()
        await self.session.refresh(service)

        return ServiceImageUploadResponse(
            service_id=str(service.id),
            image=image,
        )

    async def remove_image(
        self,
        business: Business,
        service_id: uuid.UUID,
    ) -> ServiceImageRemoveResponse:
        service = await self.get_for_business(business, service_id)
        delete_service_image_files_if_owned(business.id, service.id, service.image_)
        await self.repo.update(service, {"image_": None})
        await self.session.commit()
        await self.session.refresh(service)
        return ServiceImageRemoveResponse(service_id=str(service.id), removed=True)

    async def list_public(
        self,
        business: Business,
        *,
        type: ServiceType | None = None,
    ) -> list[Service]:
        allowed = allowed_types_for_operating_mode(business.operating_mode)
        if type is not None and type not in allowed:
            return []
        return await self.repo.list_public_for_business(
            business.id,
            type=type,
            allowed_types=allowed if type is None else None,
        )

    async def get_public(
        self,
        business: Business,
        service_id: uuid.UUID,
    ) -> Service:
        service = await self.repo.get_by_business_and_id(business.id, service_id)
        if service is None or not service.is_active:
            raise NotFoundError("Service not found.")
        allowed = allowed_types_for_operating_mode(business.operating_mode)
        if service.type not in allowed:
            raise NotFoundError("Service not found.")
        return service

    async def _enforce_free_plan_limit(self, business_id: uuid.UUID) -> None:
        subscription = await self.business_repo.get_subscription(business_id)
        if subscription is None or subscription.plan != SubscriptionPlan.free:
            return
        count = await self.repo.count_for_business(business_id)
        if count >= FREE_PLAN_MAX_SERVICES:
            raise PlanLimitExceededError(
                f"Free plan allows a maximum of {FREE_PLAN_MAX_SERVICES} services."
            )

    def _validate_type_for_operating_mode(
        self,
        business: Business,
        service_type: ServiceType,
    ) -> None:
        allowed = allowed_types_for_operating_mode(business.operating_mode)
        if service_type not in allowed:
            raise ValidationAppError(
                f"Service type '{service_type.value}' is not allowed for "
                f"operating mode '{business.operating_mode.value}'."
            )

    def _validate_required_category(
        self,
        business: Business,
        category: str | None,
    ) -> None:
        settings = business.settings or {}
        if not bool(settings.get("require_service_category", False)):
            return
        if not (category or "").strip():
            raise ValidationAppError(
                "A service category is required by your business settings."
            )

    def _resolve_duration(
        self,
        service_type: ServiceType,
        duration_minutes: int | None,
    ) -> int | None:
        if service_type == ServiceType.order:
            return None
        if duration_minutes is None:
            raise ValidationAppError(
                "duration_minutes is required for booking services"
            )
        return duration_minutes

    def _validate_price(
        self,
        price_type: PriceType,
        price_cents: int | None,
    ) -> None:
        if price_type == PriceType.fixed:
            if price_cents is None or price_cents < 0:
                raise ValidationAppError(
                    "price_cents must be >= 0 when price_type is fixed"
                )
