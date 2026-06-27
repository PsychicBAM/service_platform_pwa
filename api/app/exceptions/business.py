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
