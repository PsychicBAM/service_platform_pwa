import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import case, exists, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

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
from app.models.user import User
from app.utils.public_directory_sort import normalize_directory_sort

ALLOWED_AUTO_REVIEW_REQUEST_DELAY_MINUTES = frozenset({0, 60, 1440, 2880, 10080})

ALLOWED_SERVICE_CURRENCIES = frozenset(
    {"USD", "EUR", "GBP", "CAD", "AUD", "SAR", "AED", "RUB"}
)
ALLOWED_PRICE_DISPLAY_MODES = frozenset({"including_tax", "excluding_tax", "hide_tax"})
ALLOWED_SERVICE_VISIBILITY_MODES = frozenset({"all_visible", "active_only"})
ALLOWED_DURATION_UNITS = frozenset({"minutes"})
ALLOWED_DURATION_INCREMENTS = frozenset({5, 10, 15, 20, 30, 45, 60})
ALLOWED_TAX_MODES = frozenset({"none", "inclusive", "exclusive"})
ALLOWED_SERVICE_ADDON_SELECTION_MODES = frozenset(
    {"customer_choice", "preselected_none", "required"}
)
ALLOWED_SERVICE_ADDON_DISPLAY_MODES = frozenset({"service_page", "checkout", "both"})

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
    "auto_review_request_enabled": False,
    "auto_review_request_delay_minutes": 1440,
    # Global service configuration (Settings → Services)
    "service_currency": "USD",
    "price_display": "including_tax",  # legacy; prefer show_tax_note_to_customers
    "tax_mode": "none",
    "tax_rate_percent": 0.0,
    "show_tax_note_to_customers": True,
    "service_visibility": "all_visible",
    "show_service_duration": True,
    "show_service_description": True,
    "show_service_capacity": False,
    "show_service_images": True,
    "show_service_categories": True,
    "require_service_category": False,
    "duration_unit": "minutes",
    "default_duration_minutes": 60,
    "duration_increment_minutes": 15,
    # 0 = no window limit when auto_confirm_bookings is enabled
    "auto_confirm_within_hours": 0,
    "service_addons_enabled": False,
    "service_addon_selection_mode": "customer_choice",
    "service_addon_display": "service_page",
}


class BusinessRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_slug(self, slug: str) -> Business | None:
        stmt = select(Business).where(Business.slug == slug.lower())
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_public_by_slug(self, slug: str) -> Business | None:
        stmt = select(Business).where(
            Business.slug == slug.lower(),
            Business.status == BusinessStatus.active,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def update_business(self, business: Business, data: dict[str, Any]) -> Business:
        for key, value in data.items():
            setattr(business, key, value)
        await self.session.flush()
        return business

    async def update_settings(
        self,
        business: Business,
        settings_patch: dict[str, Any],
    ) -> Business:
        merged = {**(business.settings or {}), **settings_patch}
        business.settings = merged
        flag_modified(business, "settings")
        await self.session.flush()
        return business

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

    async def update_subscription(
        self,
        subscription: Subscription,
        data: dict[str, Any],
    ) -> Subscription:
        for key, value in data.items():
            setattr(subscription, key, value)
        await self.session.flush()
        return subscription

    async def get_owner_user(self, business_id: uuid.UUID) -> User | None:
        stmt = (
            select(User)
            .join(BusinessMember, BusinessMember.user_id == User.id)
            .where(
                BusinessMember.business_id == business_id,
                BusinessMember.role == BusinessMemberRole.owner,
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    def _superadmin_list_filters(
        self,
        stmt,
        *,
        search: str | None = None,
        status: BusinessStatus | None = None,
        plan: SubscriptionPlan | None = None,
    ):
        stmt = stmt.join(Subscription, Subscription.business_id == Business.id)
        stmt = stmt.outerjoin(
            BusinessMember,
            (BusinessMember.business_id == Business.id)
            & (BusinessMember.role == BusinessMemberRole.owner),
        ).outerjoin(User, User.id == BusinessMember.user_id)
        if status is not None:
            stmt = stmt.where(Business.status == status)
        if plan is not None:
            stmt = stmt.where(Subscription.plan == plan)
        if search:
            term = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(
                    Business.name.ilike(term),
                    Business.slug.ilike(term),
                    User.email.ilike(term),
                )
            )
        return stmt

    async def list_for_superadmin(
        self,
        *,
        search: str | None = None,
        status: BusinessStatus | None = None,
        plan: SubscriptionPlan | None = None,
        page: int = 1,
        limit: int = 20,
    ) -> list[tuple[Business, Subscription, str | None]]:
        stmt = select(Business, Subscription, User.email)
        stmt = self._superadmin_list_filters(
            stmt,
            search=search,
            status=status,
            plan=plan,
        )
        stmt = stmt.order_by(Business.created_at.desc())
        offset = max(page - 1, 0) * limit
        stmt = stmt.offset(offset).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.all())

    async def count_for_superadmin(
        self,
        *,
        search: str | None = None,
        status: BusinessStatus | None = None,
        plan: SubscriptionPlan | None = None,
    ) -> int:
        stmt = select(func.count(func.distinct(Business.id))).select_from(Business)
        stmt = self._superadmin_list_filters(
            stmt,
            search=search,
            status=status,
            plan=plan,
        )
        result = await self.session.execute(stmt)
        return int(result.scalar_one())

    def _public_directory_filters(
        self,
        stmt,
        *,
        q: str | None = None,
        location: str | None = None,
        category: str | None = None,
        category_keywords: list[str] | None = None,
        rating_min: float | None = None,
        bookable: bool | None = None,
        requests: bool | None = None,
        reviews: bool | None = None,
        cover: bool | None = None,
        review_subq=None,
    ):
        from app.models.enums import ServiceType
        from app.models.service import Service

        stmt = stmt.where(Business.status == BusinessStatus.active)
        if q and q.strip():
            term = f"%{q.strip()}%"
            service_match = select(Service.business_id).where(
                Service.is_active.is_(True),
                Service.name.ilike(term),
            )
            stmt = stmt.where(
                or_(
                    Business.name.ilike(term),
                    Business.description.ilike(term),
                    Business.address.ilike(term),
                    Business.id.in_(service_match),
                )
            )
        if location and location.strip():
            term = f"%{location.strip()}%"
            location_json = Business.settings["public_location"]
            stmt = stmt.where(
                or_(
                    location_json["city"].as_string().ilike(term),
                    location_json["district_or_area"].as_string().ilike(term),
                    location_json["public_address"].as_string().ilike(term),
                    location_json["country"].as_string().ilike(term),
                    Business.address.ilike(term),
                )
            )
        if category or category_keywords:
            category_clauses = []
            if category:
                explicit_match = select(Service.business_id).where(
                    Service.is_active.is_(True),
                    Service.category == category,
                )
                category_clauses.append(Business.id.in_(explicit_match))
            if category_keywords:
                for keyword in category_keywords:
                    term = f"%{keyword}%"
                    service_match = select(Service.business_id).where(
                        Service.is_active.is_(True),
                        or_(
                            Service.name.ilike(term),
                            Service.description.ilike(term),
                        ),
                    )
                    category_clauses.append(Business.name.ilike(term))
                    category_clauses.append(Business.description.ilike(term))
                    category_clauses.append(Business.id.in_(service_match))
            stmt = stmt.where(or_(*category_clauses))
        if rating_min is not None and review_subq is not None:
            stmt = stmt.where(review_subq.c.avg_rating >= rating_min)
        if bookable:
            booking_match = select(Service.business_id).where(
                Service.is_active.is_(True),
                Service.type == ServiceType.booking,
            )
            stmt = stmt.where(Business.id.in_(booking_match))
        if requests:
            request_match = select(Service.business_id).where(
                Service.is_active.is_(True),
                Service.type == ServiceType.order,
            )
            stmt = stmt.where(Business.id.in_(request_match))
        if reviews and review_subq is not None:
            stmt = stmt.where(func.coalesce(review_subq.c.review_count, 0) > 0)
        if cover:
            marketplace_cover_json = Business.settings["marketplace_cover_image"]
            service_cover_match = select(Service.business_id).where(
                Service.is_active.is_(True),
                or_(
                    Service.image_["url"].as_string().like("/uploads/%"),
                    Service.image_["thumbnail_url"].as_string().like("/uploads/%"),
                ),
            )
            stmt = stmt.where(
                or_(
                    marketplace_cover_json["url"].as_string().like("/uploads/%"),
                    Business.id.in_(service_cover_match),
                )
            )
        return stmt

    def _apply_public_directory_sort(self, stmt, *, sort: str, review_subq):
        from app.models.enums import ServiceType
        from app.models.service import Service

        normalized = normalize_directory_sort(sort)

        if normalized == "rating":
            return stmt.order_by(
                review_subq.c.avg_rating.desc().nullslast(),
                review_subq.c.review_count.desc().nullslast(),
                Business.name.asc(),
                Business.id.asc(),
            )
        if normalized == "reviews":
            return stmt.order_by(
                review_subq.c.review_count.desc().nullslast(),
                review_subq.c.avg_rating.desc().nullslast(),
                Business.name.asc(),
                Business.id.asc(),
            )
        if normalized == "newest":
            return stmt.order_by(
                Business.created_at.desc(),
                Business.id.desc(),
                Business.name.asc(),
            )
        if normalized == "bookable":
            has_booking = exists(
                select(Service.id).where(
                    Service.business_id == Business.id,
                    Service.is_active.is_(True),
                    Service.type == ServiceType.booking,
                )
            )
            bookable_rank = case((has_booking, 1), else_=0)
            return stmt.order_by(
                bookable_rank.desc(),
                review_subq.c.review_count.desc().nullslast(),
                review_subq.c.avg_rating.desc().nullslast(),
                Business.name.asc(),
                Business.id.asc(),
            )
        if normalized == "name":
            return stmt.order_by(Business.name.asc(), Business.id.asc())

        return stmt.order_by(
            review_subq.c.review_count.desc().nullslast(),
            review_subq.c.avg_rating.desc().nullslast(),
            Business.name.asc(),
            Business.id.asc(),
        )

    async def list_public_directory(
        self,
        *,
        q: str | None = None,
        location: str | None = None,
        category: str | None = None,
        category_keywords: list[str] | None = None,
        rating_min: float | None = None,
        bookable: bool | None = None,
        requests: bool | None = None,
        reviews: bool | None = None,
        cover: bool | None = None,
        sort: str = "popular",
        page: int = 1,
        limit: int = 20,
    ) -> list[tuple[Business, float | None, int]]:
        from app.models.enums import ReviewStatus
        from app.models.review import Review

        review_subq = (
            select(
                Review.business_id.label("business_id"),
                func.avg(Review.rating).label("avg_rating"),
                func.count(Review.id).label("review_count"),
            )
            .where(Review.status == ReviewStatus.published)
            .group_by(Review.business_id)
            .subquery()
        )
        stmt = select(
            Business,
            review_subq.c.avg_rating,
            review_subq.c.review_count,
        ).outerjoin(review_subq, Business.id == review_subq.c.business_id)
        stmt = self._public_directory_filters(
            stmt,
            q=q,
            location=location,
            category=category,
            category_keywords=category_keywords,
            rating_min=rating_min,
            bookable=bookable,
            requests=requests,
            reviews=reviews,
            cover=cover,
            review_subq=review_subq,
        )
        stmt = self._apply_public_directory_sort(stmt, sort=sort, review_subq=review_subq)
        offset = max(page - 1, 0) * limit
        stmt = stmt.offset(offset).limit(limit)
        result = await self.session.execute(stmt)
        rows: list[tuple[Business, float | None, int]] = []
        for business, avg_rating, review_count in result.all():
            rows.append(
                (
                    business,
                    float(avg_rating) if avg_rating is not None else None,
                    int(review_count or 0),
                )
            )
        return rows

    async def count_public_directory(
        self,
        *,
        q: str | None = None,
        location: str | None = None,
        category: str | None = None,
        category_keywords: list[str] | None = None,
        rating_min: float | None = None,
        bookable: bool | None = None,
        requests: bool | None = None,
        reviews: bool | None = None,
        cover: bool | None = None,
    ) -> int:
        from app.models.enums import ReviewStatus
        from app.models.review import Review

        review_subq = (
            select(
                Review.business_id.label("business_id"),
                func.avg(Review.rating).label("avg_rating"),
                func.count(Review.id).label("review_count"),
            )
            .where(Review.status == ReviewStatus.published)
            .group_by(Review.business_id)
            .subquery()
        )
        stmt = select(func.count()).select_from(Business).outerjoin(
            review_subq,
            Business.id == review_subq.c.business_id,
        )
        stmt = self._public_directory_filters(
            stmt,
            q=q,
            location=location,
            category=category,
            category_keywords=category_keywords,
            rating_min=rating_min,
            bookable=bookable,
            requests=requests,
            reviews=reviews,
            cover=cover,
            review_subq=review_subq,
        )
        result = await self.session.execute(stmt)
        return int(result.scalar_one())

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
