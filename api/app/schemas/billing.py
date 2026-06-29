from typing import Literal

from pydantic import BaseModel, Field

CheckoutPlanId = Literal["starter", "business", "pro"]


class CheckoutPlanRequest(BaseModel):
    plan: CheckoutPlanId = Field(
        description="Paid subscription plan to purchase (Free is not allowed).",
    )


class CheckoutSessionResponse(BaseModel):
    checkout_url: str
    session_id: str
