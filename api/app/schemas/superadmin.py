import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, field_validator

from app.models.enums import (
    BusinessStatus,
    OperatingMode,
    SubscriptionPlan,
    SubscriptionStatus,
)
from app.schemas.business import BusinessSettingsRead


class SuperadminBusinessListItem(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    status: BusinessStatus
    operating_mode: OperatingMode
    owner_email: str | None
    plan: SubscriptionPlan
    subscription_status: SubscriptionStatus
    created_at: datetime
    updated_at: datetime


class SuperadminListMeta(BaseModel):
    page: int
    limit: int
    total: int


class SuperadminBusinessListResponse(BaseModel):
    data: list[SuperadminBusinessListItem]
    meta: SuperadminListMeta


class SuperadminOwnerRead(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str | None


class SuperadminSubscriptionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    plan: SubscriptionPlan
    status: SubscriptionStatus
    usage_bookings_count: int
    usage_orders_count: int


class SuperadminBusinessDetail(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    description: str | None
    status: BusinessStatus
    operating_mode: OperatingMode
    timezone: str
    contact_email: str | None
    contact_phone: str | None
    address: str | None
    settings: BusinessSettingsRead
    subscription: SuperadminSubscriptionRead | None
    owner: SuperadminOwnerRead | None
    created_at: datetime
    updated_at: datetime


ALLOWED_SUPERADMIN_STATUSES = {
    BusinessStatus.active,
    BusinessStatus.suspended,
    BusinessStatus.pending_setup,
}

ALLOWED_SUPERADMIN_PLANS = {
    SubscriptionPlan.free,
    SubscriptionPlan.starter,
    SubscriptionPlan.business,
    SubscriptionPlan.pro,
}


class SuperadminBusinessUpdate(BaseModel):
    status: BusinessStatus | None = None
    plan: SubscriptionPlan | None = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: BusinessStatus | None) -> BusinessStatus | None:
        if value is not None and value not in ALLOWED_SUPERADMIN_STATUSES:
            raise ValueError("Invalid business status.")
        return value

    @field_validator("plan")
    @classmethod
    def validate_plan(cls, value: SubscriptionPlan | None) -> SubscriptionPlan | None:
        if value is not None and value not in ALLOWED_SUPERADMIN_PLANS:
            raise ValueError("Invalid subscription plan.")
        return value


class AuditLogRead(BaseModel):
    id: uuid.UUID
    actor_user_id: uuid.UUID | None
    business_id: uuid.UUID | None
    action: str
    target_type: str | None
    target_id: uuid.UUID | None
    metadata: dict[str, Any]
    created_at: datetime

    @classmethod
    def from_audit_log(cls, log) -> "AuditLogRead":
        return cls(
            id=log.id,
            actor_user_id=log.actor_user_id,
            business_id=log.business_id,
            action=log.action,
            target_type=log.target_type,
            target_id=log.target_id,
            metadata=log.log_metadata,
            created_at=log.created_at,
        )


class AuditLogListResponse(BaseModel):
    data: list[AuditLogRead]
    meta: SuperadminListMeta
