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
