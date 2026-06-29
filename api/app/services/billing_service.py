from __future__ import annotations

import uuid

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
from app.models.enums import SubscriptionPlan
from app.models.user import User
from app.schemas.billing import CheckoutSessionResponse
from app.services.stripe_config import (
    get_stripe_price_id_for_plan,
    is_checkout_eligible_plan,
)


class BillingService:
    def __init__(
        self,
        session: AsyncSession,
        settings: Settings | None = None,
    ) -> None:
        self.session = session
        self.settings = settings or get_settings()

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

    def _checkout_success_url(self) -> str:
        base = self.settings.stripe_success_url.strip()
        if "{CHECKOUT_SESSION_ID}" in base:
            return base
        separator = "&" if "?" in base else "?"
        return f"{base}{separator}session_id={{CHECKOUT_SESSION_ID}}"
