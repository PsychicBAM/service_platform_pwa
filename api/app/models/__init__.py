"""ORM models — import all modules so Alembic metadata is complete."""

from app.models.audit_log import AuditLog
from app.models.booking import Booking
from app.models.booking_waitlist_entry import BookingWaitlistEntry
from app.models.business import Business
from app.models.business_member import BusinessMember
from app.models.client import Client
from app.models.email_verification_token import EmailVerificationToken
from app.models.legal_consent_record import LegalConsentRecord
from app.models.password_reset_token import PasswordResetToken
from app.models.enums import (
    BookingStatus,
    WaitlistStatus,
    ReviewStatus,
    BusinessMemberRole,
    BusinessStatus,
    CancelledBy,
    ClientSource,
    ConsentEntityType,
    ConsentSource,
    OperatingMode,
    OrderMessageSenderType,
    OrderStatus,
    PriceType,
    ServiceType,
    SubscriptionPlan,
    SubscriptionStatus,
    UserRole,
)
from app.models.order import Order
from app.models.order_message import OrderMessage
from app.models.review import Review
from app.models.service import Service
from app.models.service_slot_capacity_override import ServiceSlotCapacityOverride
from app.models.subscription import Subscription
from app.models.unavailable_time import UnavailableTime
from app.models.user import User
from app.models.working_break import WorkingBreak
from app.models.working_hour import WorkingHour

__all__ = [
    "EmailVerificationToken",
    "PasswordResetToken",
    "LegalConsentRecord",
    "AuditLog",
    "Booking",
    "BookingStatus",
    "BookingWaitlistEntry",
    "Business",
    "BusinessMember",
    "BusinessMemberRole",
    "BusinessStatus",
    "CancelledBy",
    "Client",
    "ClientSource",
    "ConsentEntityType",
    "ConsentSource",
    "OperatingMode",
    "Order",
    "OrderMessage",
    "OrderMessageSenderType",
    "OrderStatus",
    "ReviewStatus",
    "Review",
    "PriceType",
    "Service",
    "ServiceSlotCapacityOverride",
    "ServiceType",
    "Subscription",
    "SubscriptionPlan",
    "SubscriptionStatus",
    "UnavailableTime",
    "User",
    "UserRole",
    "WaitlistStatus",
    "WorkingBreak",
    "WorkingHour",
]
