import uuid

import stripe
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.business import get_business_for_admin_or_403
from app.exceptions.billing import (
    StripeWebhookDisabledError,
    StripeWebhookProcessingError,
    StripeWebhookSignatureError,
)
from app.models.business import Business
from app.models.enums import SubscriptionPlan
from app.models.user import User
from app.schemas.billing import (
    CheckoutPlanRequest,
    CheckoutSessionResponse,
    StripeWebhookResponse,
)
from app.services.billing_service import BillingService

router = APIRouter(prefix="/businesses", tags=["billing"])
webhook_router = APIRouter(prefix="/billing", tags=["billing"])


@router.post(
    "/{business_id}/billing/checkout-session",
    response_model=CheckoutSessionResponse,
)
async def create_billing_checkout_session(
    business_id: uuid.UUID,
    payload: CheckoutPlanRequest,
    business: Business = Depends(get_business_for_admin_or_403),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CheckoutSessionResponse:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    plan = SubscriptionPlan(payload.plan)
    return await BillingService(db).create_checkout_session(
        business=business,
        current_user=current_user,
        plan=plan,
    )


@webhook_router.post("/stripe/webhook", response_model=StripeWebhookResponse)
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> StripeWebhookResponse:
    service = BillingService(db)

    if not service.settings.stripe_enabled:
        raise StripeWebhookDisabledError()

    webhook_secret = (service.settings.stripe_webhook_secret or "").strip()
    if not webhook_secret:
        raise StripeWebhookDisabledError()

    payload = await request.body()
    signature = request.headers.get("stripe-signature")
    if not signature:
        raise StripeWebhookSignatureError()

    try:
        event = stripe.Webhook.construct_event(payload, signature, webhook_secret)
    except stripe.SignatureVerificationError as exc:
        raise StripeWebhookSignatureError() from exc
    except ValueError as exc:
        raise StripeWebhookSignatureError() from exc

    try:
        result = await service.handle_stripe_webhook_event(event)
        await db.commit()
        return result
    except Exception as exc:
        await db.rollback()
        raise StripeWebhookProcessingError() from exc
