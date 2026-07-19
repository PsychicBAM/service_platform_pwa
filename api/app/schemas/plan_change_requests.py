import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import (
    PlanChangeDirection,
    PlanChangeRequestStatus,
    SubscriptionPlan,
)


class PlanChangeRequestCreate(BaseModel):
    requested_plan: SubscriptionPlan
    note: str | None = Field(default=None, max_length=2000)


class PlanChangeRequestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: uuid.UUID
    requested_by_user_id: uuid.UUID | None
    current_plan: SubscriptionPlan
    requested_plan: SubscriptionPlan
    direction: PlanChangeDirection
    status: PlanChangeRequestStatus
    note: str | None
    created_at: datetime
    updated_at: datetime
    resolved_at: datetime | None
    resolved_by_user_id: uuid.UUID | None


class SuperadminPlanChangeRequestRead(PlanChangeRequestRead):
    business_name: str
    business_slug: str


class SuperadminPlanChangeRequestListMeta(BaseModel):
    page: int
    limit: int
    total: int


class SuperadminPlanChangeRequestListResponse(BaseModel):
    data: list[SuperadminPlanChangeRequestRead]
    meta: SuperadminPlanChangeRequestListMeta


class PlanChangeRequestResolveResponse(BaseModel):
    request: SuperadminPlanChangeRequestRead
    business_plan: SubscriptionPlan
