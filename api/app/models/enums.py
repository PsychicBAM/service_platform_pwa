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


class ServiceType(str, enum.Enum):
    booking = "booking"
    order = "order"


class PriceType(str, enum.Enum):
    fixed = "fixed"
    free = "free"
    quote = "quote"


class ClientSource(str, enum.Enum):
    registered = "registered"
    guest = "guest"
    admin_created = "admin_created"


class BookingStatus(str, enum.Enum):
    pending = "pending"
    pending_payment = "pending_payment"
    confirmed = "confirmed"
    completed = "completed"
    cancelled = "cancelled"
    no_show = "no_show"


class CancelledBy(str, enum.Enum):
    client = "client"
    admin = "admin"
    system = "system"


class OrderStatus(str, enum.Enum):
    submitted = "submitted"
    pending_payment = "pending_payment"
    accepted = "accepted"
    in_progress = "in_progress"
    completed = "completed"
    declined = "declined"
    cancelled = "cancelled"


class OrderMessageSenderType(str, enum.Enum):
    client = "client"
    admin = "admin"


class ConsentSource(str, enum.Enum):
    registration = "registration"
    public_booking = "public_booking"
    public_order = "public_order"


class ConsentEntityType(str, enum.Enum):
    business = "business"
    booking = "booking"
    order = "order"
