"""Domain enums — string values match DATA_MODEL_DRAFT.md and API_DRAFT.md."""

import enum


class UserRole(str, enum.Enum):
    client = "client"
    business_admin = "business_admin"
    superadmin = "superadmin"


class BusinessStatus(str, enum.Enum):
    active = "active"
    suspended = "suspended"
    pending_setup = "pending_setup"


class OperatingMode(str, enum.Enum):
    booking_only = "booking_only"
    orders_only = "orders_only"
    both = "both"


class BusinessMemberRole(str, enum.Enum):
    owner = "owner"
    admin = "admin"
    staff = "staff"


class SubscriptionPlan(str, enum.Enum):
    free = "free"
    starter = "starter"
    business = "business"
    pro = "pro"


class SubscriptionStatus(str, enum.Enum):
    active = "active"
    past_due = "past_due"
    cancelled = "cancelled"
    trialing = "trialing"
