from __future__ import annotations

import uuid
from typing import Any

import stripe
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.exceptions.billing import (
    InvalidCheckoutPlanError,
    StripeCheckoutCreateError,
    StripeDisabledError,
    StripePriceNotConfiguredError,
)
from app.models.business import Business
from app.models.enums import SubscriptionPlan, SubscriptionStatus
from app.models.user import User
from app.repositories.audit_log_repository import AuditLogRepository
from app.repositories.business_repository import BusinessRepository
from app.schemas.billing import CheckoutSessionResponse, StripeWebhookResponse
from app.services.audit_log_service import AuditLogService
from app.services.stripe_config import (
    get_stripe_price_id_for_plan,
    is_checkout_eligible_plan,
)


def _event_field(event: Any, *keys: str) -> Any:
    current = event
    for key in keys:
        if isinstance(current, dict):
            current = current[key]
        else:
            current = getattr(current, key)
    return current


def _metadata_dict(value: Any) -> dict[str, str]:
    if isinstance(value, dict):
        return {str(k): str(v) for k, v in value.items() if v is not None}
    return {str(k): str(v) for k, v in dict(value).items() if v is not None}


class BillingService:
    def __init__(
        self,
        session: AsyncSession,
        settings: Settings | None = None,
    ) -> None:
        self.session = session
        self.settings = settings or get_settings()
        self.business_repo = BusinessRepository(session)
        self.audit = AuditLogService(session)
        self.audit_repo = AuditLogRepository(session)

    async def create_checkout_session(
        self,
        *,
        business: Business,
        current_user: User,
        plan: SubscriptionPlan,
    ) -> CheckoutSessionResponse:
        if not is_checkout_eligible_plan(plan):
            raise InvalidCheckoutPlanError()

        if not self.settings.stripe_enabled:
            raise StripeDisabledError()

        price_id = get_stripe_price_id_for_plan(plan, self.settings)
        if not price_id:
            raise StripePriceNotConfiguredError()

        secret_key = (self.settings.stripe_secret_key or "").strip()
        if not secret_key:
            raise StripeDisabledError()

        stripe.api_key = secret_key
        success_url = self._checkout_success_url()

        try:
            session = stripe.checkout.Session.create(
                mode="subscription",
                line_items=[{"price": price_id, "quantity": 1}],
                success_url=success_url,
                cancel_url=self.settings.stripe_cancel_url,
                metadata={
                    "business_id": str(business.id),
                    "requested_plan": plan.value,
                    "user_id": str(current_user.id),
                },
                client_reference_id=str(business.id),
            )
        except stripe.StripeError as exc:
            raise StripeCheckoutCreateError() from exc

        checkout_url = session.url
        session_id = session.id
        if not checkout_url or not session_id:
            raise StripeCheckoutCreateError()

        return CheckoutSessionResponse(
            checkout_url=checkout_url,
            session_id=session_id,
        )

    async def handle_stripe_webhook_event(self, event: Any) -> StripeWebhookResponse:
        event_type = str(_event_field(event, "type"))
        event_id = str(_event_field(event, "id"))

        if event_type != "checkout.session.completed":
            return StripeWebhookResponse(
                processed=False,
                ignored=True,
                event_type=event_type,
            )

        if await self.audit_repo.has_metadata_value(
            metadata_key="stripe_event_id",
            metadata_value=event_id,
        ):
            return StripeWebhookResponse(
                processed=True,
                ignored=True,
                event_type=event_type,
            )

        session_object = _event_field(event, "data", "object")
        metadata = _metadata_dict(_event_field(session_object, "metadata"))
        business_id_raw = metadata.get("business_id", "").strip()
        requested_plan_raw = metadata.get("requested_plan", "").strip()
        session_id = str(_event_field(session_object, "id"))

        if not business_id_raw:
            return StripeWebhookResponse(
                processed=False,
                ignored=True,
                event_type=event_type,
            )

        try:
            business_id = uuid.UUID(business_id_raw)
            requested_plan = SubscriptionPlan(requested_plan_raw)
        except (ValueError, KeyError):
            return StripeWebhookResponse(
                processed=False,
                ignored=True,
                event_type=event_type,
            )

        if not is_checkout_eligible_plan(requested_plan):
            return StripeWebhookResponse(
                processed=False,
                ignored=True,
                event_type=event_type,
            )

        subscription = await self.business_repo.get_subscription(business_id)
        if subscription is None:
            return StripeWebhookResponse(
                processed=False,
                ignored=True,
                event_type=event_type,
            )

        old_plan = subscription.plan
        if old_plan == requested_plan:
            return StripeWebhookResponse(
                processed=True,
                ignored=True,
                event_type=event_type,
            )

        await self.business_repo.update_subscription(
            subscription,
            {
                "plan": requested_plan,
                "status": SubscriptionStatus.active,
            },
        )

        actor_user_id: uuid.UUID | None = None
        user_id_raw = metadata.get("user_id", "").strip()
        if user_id_raw:
            try:
                actor_user_id = uuid.UUID(user_id_raw)
            except ValueError:
                actor_user_id = None

        await self.audit.create_audit_log(
            actor_user_id=actor_user_id,
            business_id=business_id,
            action="subscription.plan_changed",
            target_type="subscription",
            target_id=subscription.id,
            metadata={
                "old_plan": old_plan.value,
                "new_plan": requested_plan.value,
                "stripe_event_id": event_id,
                "stripe_session_id": session_id,
                "business_id": str(business_id),
                "requested_plan": requested_plan.value,
                "change_source": "stripe_webhook",
            },
        )

        return StripeWebhookResponse(
            processed=True,
            ignored=False,
            event_type=event_type,
        )

    def _checkout_success_url(self) -> str:
        base = self.settings.stripe_success_url.strip()
        if "{CHECKOUT_SESSION_ID}" in base:
            return base
        separator = "&" if "?" in base else "?"
        return f"{base}{separator}session_id={{CHECKOUT_SESSION_ID}}"
