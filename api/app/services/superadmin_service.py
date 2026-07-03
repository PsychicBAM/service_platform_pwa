from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.business import BusinessNotFoundError
from app.models.business import Business
from app.models.enums import BusinessStatus, SubscriptionPlan
from app.models.subscription import Subscription
from app.repositories.business_repository import BusinessRepository
from app.schemas.business import BusinessSettingsRead
from app.schemas.superadmin import (
    SuperadminBusinessDetail,
    SuperadminBusinessListItem,
    SuperadminBusinessListResponse,
    SuperadminBusinessUpdate,
    SuperadminListMeta,
    SuperadminOwnerRead,
    SuperadminSubscriptionRead,
)
from app.services.audit_log_service import AuditLogService


def _plan_intent_from_settings(settings: dict | None) -> dict:
    merged = settings or {}
    raw_intent = merged.get("selected_plan_intent")
    intent: SubscriptionPlan | None = None
    if raw_intent is not None:
        try:
            intent = SubscriptionPlan(raw_intent)
        except ValueError:
            intent = None
    return {
        "selected_plan_intent": intent,
        "selected_plan_intent_source": merged.get("selected_plan_intent_source"),
        "selected_plan_intent_recorded_at": merged.get("selected_plan_intent_recorded_at"),
    }


class SuperadminService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = BusinessRepository(session)
        self.audit = AuditLogService(session)

    async def list_businesses(
        self,
        *,
        search: str | None = None,
        status: BusinessStatus | None = None,
        plan: SubscriptionPlan | None = None,
        page: int = 1,
        limit: int = 20,
    ) -> SuperadminBusinessListResponse:
        rows = await self.repo.list_for_superadmin(
            search=search,
            status=status,
            plan=plan,
            page=page,
            limit=limit,
        )
        total = await self.repo.count_for_superadmin(
            search=search,
            status=status,
            plan=plan,
        )
        data = [
            SuperadminBusinessListItem(
                id=business.id,
                name=business.name,
                slug=business.slug,
                status=business.status,
                operating_mode=business.operating_mode,
                owner_email=owner_email,
                plan=subscription.plan,
                subscription_status=subscription.status,
                selected_plan_intent=_plan_intent_from_settings(business.settings)[
                    "selected_plan_intent"
                ],
                created_at=business.created_at,
                updated_at=business.updated_at,
            )
            for business, subscription, owner_email in rows
        ]
        return SuperadminBusinessListResponse(
            data=data,
            meta=SuperadminListMeta(page=page, limit=limit, total=total),
        )

    async def get_business_detail(self, business_id: uuid.UUID) -> SuperadminBusinessDetail:
        business = await self._get_business_or_404(business_id)
        subscription = await self.repo.get_subscription(business_id)
        owner = await self.repo.get_owner_user(business_id)
        return self._to_detail(business, subscription, owner)

    async def update_business_admin_fields(
        self,
        business_id: uuid.UUID,
        payload: SuperadminBusinessUpdate,
        *,
        actor_user_id: uuid.UUID,
    ) -> SuperadminBusinessDetail:
        business = await self._get_business_or_404(business_id)
        subscription = await self.repo.get_subscription(business_id)
        changed = False

        if payload.status is not None and payload.status != business.status:
            old_status = business.status
            await self.repo.update_business(business, {"status": payload.status})
            await self.audit.create_audit_log(
                actor_user_id=actor_user_id,
                business_id=business_id,
                action="business.status_changed",
                target_type="business",
                target_id=business_id,
                metadata={
                    "old_status": old_status.value,
                    "new_status": payload.status.value,
                },
            )
            changed = True

        if payload.plan is not None:
            if subscription is None:
                raise BusinessNotFoundError("Subscription not found for business.")
            if payload.plan != subscription.plan:
                old_plan = subscription.plan
                await self.repo.update_subscription(subscription, {"plan": payload.plan})
                intent_fields = _plan_intent_from_settings(business.settings)
                metadata: dict[str, str] = {
                    "old_plan": old_plan.value,
                    "new_plan": payload.plan.value,
                    "change_source": "superadmin_manual",
                }
                if intent_fields["selected_plan_intent"] is not None:
                    metadata["selected_plan_intent"] = intent_fields[
                        "selected_plan_intent"
                    ].value
                if intent_fields["selected_plan_intent_source"]:
                    metadata["selected_plan_intent_source"] = str(
                        intent_fields["selected_plan_intent_source"]
                    )
                await self.audit.create_audit_log(
                    actor_user_id=actor_user_id,
                    business_id=business_id,
                    action="subscription.plan_changed",
                    target_type="subscription",
                    target_id=subscription.id,
                    metadata=metadata,
                )
                changed = True

        if changed:
            await self.session.commit()

        await self.session.refresh(business)
        if subscription is not None:
            await self.session.refresh(subscription)
        owner = await self.repo.get_owner_user(business_id)
        return self._to_detail(business, subscription, owner)

    async def _get_business_or_404(self, business_id: uuid.UUID) -> Business:
        business = await self.repo.get_by_id(business_id)
        if business is None:
            raise BusinessNotFoundError()
        return business

    @staticmethod
    def _to_detail(
        business: Business,
        subscription: Subscription | None,
        owner,
    ) -> SuperadminBusinessDetail:
        intent_fields = _plan_intent_from_settings(business.settings)
        return SuperadminBusinessDetail(
            id=business.id,
            name=business.name,
            slug=business.slug,
            description=business.description,
            status=business.status,
            operating_mode=business.operating_mode,
            timezone=business.timezone,
            contact_email=business.contact_email,
            contact_phone=business.contact_phone,
            address=business.address,
            settings=BusinessSettingsRead.from_settings(business.settings),
            selected_plan_intent=intent_fields["selected_plan_intent"],
            selected_plan_intent_source=intent_fields["selected_plan_intent_source"],
            selected_plan_intent_recorded_at=intent_fields["selected_plan_intent_recorded_at"],
            subscription=(
                SuperadminSubscriptionRead.model_validate(subscription)
                if subscription is not None
                else None
            ),
            owner=(
                SuperadminOwnerRead(
                    id=owner.id,
                    email=owner.email,
                    full_name=owner.full_name,
                )
                if owner is not None
                else None
            ),
            created_at=business.created_at,
            updated_at=business.updated_at,
        )
