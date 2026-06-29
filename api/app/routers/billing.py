import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.business import get_business_for_admin_or_403
from app.models.business import Business
from app.models.enums import SubscriptionPlan
from app.models.user import User
from app.schemas.billing import CheckoutPlanRequest, CheckoutSessionResponse
from app.services.billing_service import BillingService

router = APIRouter(prefix="/businesses", tags=["billing"])


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
