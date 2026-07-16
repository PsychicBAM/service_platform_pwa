from app.exceptions.auth import AppError


class NotFoundError(AppError):
    def __init__(self, message: str = "Resource not found.") -> None:
        super().__init__(message=message, code="NOT_FOUND", status_code=404)


class ForbiddenError(AppError):
    def __init__(self, message: str = "Forbidden.") -> None:
        super().__init__(message=message, code="FORBIDDEN", status_code=403)


class PlanLimitExceededError(AppError):
    def __init__(self, message: str = "Plan limit exceeded.") -> None:
        super().__init__(message=message, code="PLAN_LIMIT_EXCEEDED", status_code=403)


class ValidationAppError(AppError):
    def __init__(self, message: str) -> None:
        super().__init__(message=message, code="VALIDATION_ERROR", status_code=400)


class ServiceNotBookableError(AppError):
    def __init__(self, message: str = "Service is not bookable.") -> None:
        super().__init__(message=message, code="SERVICE_NOT_BOOKABLE", status_code=400)


class ServiceNotOrderableError(AppError):
    def __init__(self, message: str = "Service is not orderable.") -> None:
        super().__init__(message=message, code="SERVICE_NOT_ORDERABLE", status_code=400)


class OrdersDisabledError(AppError):
    def __init__(self, message: str = "Business operating mode does not allow orders.") -> None:
        super().__init__(message=message, code="ORDERS_DISABLED", status_code=400)


class SlotUnavailableError(AppError):
    def __init__(self, message: str = "Requested slot is not available.") -> None:
        super().__init__(message=message, code="SLOT_UNAVAILABLE", status_code=409)


class SlotCapacityOverrideExistsError(AppError):
    def __init__(
        self,
        message: str = "A capacity override already exists for this time slot.",
    ) -> None:
        super().__init__(
            message=message,
            code="SLOT_CAPACITY_OVERRIDE_EXISTS",
            status_code=409,
        )


class WaitlistDisabledError(AppError):
    def __init__(self, message: str = "Waitlist is not enabled for this service.") -> None:
        super().__init__(message=message, code="WAITLIST_DISABLED", status_code=400)


class SlotStillAvailableError(AppError):
    def __init__(
        self,
        message: str = "This time slot is still available to book.",
    ) -> None:
        super().__init__(message=message, code="SLOT_STILL_AVAILABLE", status_code=409)


class WaitlistDuplicateError(AppError):
    def __init__(
        self,
        message: str = "You are already on the waitlist for this time slot.",
    ) -> None:
        super().__init__(message=message, code="WAITLIST_DUPLICATE", status_code=409)


class WaitlistNotPromotableError(AppError):
    def __init__(
        self,
        message: str = "This waitlist entry cannot be promoted.",
    ) -> None:
        super().__init__(message=message, code="WAITLIST_NOT_PROMOTABLE", status_code=400)


class BookingCancelTooLateError(AppError):
    def __init__(self, message: str = "Cancellation or reschedule window has passed.") -> None:
        super().__init__(message=message, code="BOOKING_CANCEL_TOO_LATE", status_code=400)


class InvalidBookingStatusTransitionError(AppError):
    def __init__(self, message: str = "Invalid booking status transition.") -> None:
        super().__init__(
            message=message,
            code="INVALID_BOOKING_STATUS_TRANSITION",
            status_code=400,
        )


class OrderNotFoundError(AppError):
    def __init__(self, message: str = "Order not found.") -> None:
        super().__init__(message=message, code="NOT_FOUND", status_code=404)


class InvalidOrderStatusTransitionError(AppError):
    def __init__(self, message: str = "Invalid order status transition.") -> None:
        super().__init__(
            message=message,
            code="INVALID_ORDER_STATUS_TRANSITION",
            status_code=400,
        )


class OrderDeclineReasonRequiredError(AppError):
    def __init__(self, message: str = "Decline reason is required.") -> None:
        super().__init__(message=message, code="DECLINE_REASON_REQUIRED", status_code=400)


class OrderMessagesClosedError(AppError):
    def __init__(self, message: str = "Messaging is closed for this order.") -> None:
        super().__init__(message=message, code="ORDER_MESSAGES_CLOSED", status_code=400)


class ClientNotFoundError(AppError):
    def __init__(self, message: str = "Client not found.") -> None:
        super().__init__(message=message, code="NOT_FOUND", status_code=404)


class ClientEmailExistsError(AppError):
    def __init__(self, message: str = "A client with this email already exists.") -> None:
        super().__init__(message=message, code="CLIENT_EMAIL_EXISTS", status_code=409)


class BusinessNotFoundError(AppError):
    def __init__(self, message: str = "Business not found.") -> None:
        super().__init__(message=message, code="NOT_FOUND", status_code=404)


class InvalidBusinessSettingsError(AppError):
    def __init__(self, message: str = "Invalid business settings.") -> None:
        super().__init__(
            message=message,
            code="INVALID_BUSINESS_SETTINGS",
            status_code=400,
        )


class InvalidTimezoneError(AppError):
    def __init__(self, message: str = "Invalid timezone.") -> None:
        super().__init__(message=message, code="INVALID_TIMEZONE", status_code=400)


class ClaimNotFoundOrMismatchError(AppError):
    def __init__(
        self,
        message: str = (
            "We could not find a matching booking or request. "
            "Check the reference and the email or phone used as a guest."
        ),
    ) -> None:
        super().__init__(
            message=message,
            code="CLAIM_NOT_FOUND_OR_MISMATCH",
            status_code=404,
        )


class ClaimAlreadyLinkedError(AppError):
    def __init__(
        self,
        message: str = "This booking or request is already linked to another account.",
    ) -> None:
        super().__init__(
            message=message,
            code="CLAIM_ALREADY_LINKED",
            status_code=409,
        )


class ReviewNotAllowedError(AppError):
    def __init__(self, message: str = "Review is not allowed for this item.") -> None:
        super().__init__(message=message, code="REVIEW_NOT_ALLOWED", status_code=400)


class ReviewDuplicateError(AppError):
    def __init__(self, message: str = "A review already exists for this item.") -> None:
        super().__init__(message=message, code="REVIEW_DUPLICATE", status_code=409)


class ReviewRequestTokenExpiredError(AppError):
    def __init__(self, message: str = "This review link has expired.") -> None:
        super().__init__(message=message, code="REVIEW_REQUEST_TOKEN_EXPIRED", status_code=400)


class ReviewRequestTokenInvalidError(AppError):
    def __init__(self, message: str = "This review link is invalid.") -> None:
        super().__init__(message=message, code="REVIEW_REQUEST_TOKEN_INVALID", status_code=400)
