class AppError(Exception):
    def __init__(self, message: str, code: str, status_code: int) -> None:
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(message)


class InvalidCredentialsError(AppError):
    def __init__(self) -> None:
        super().__init__(
            message="Invalid email or password.",
            code="INVALID_CREDENTIALS",
            status_code=401,
        )


class InvalidTokenError(AppError):
    def __init__(self, message: str = "Invalid or expired token.") -> None:
        super().__init__(
            message=message,
            code="INVALID_TOKEN",
            status_code=401,
        )


class InactiveUserError(AppError):
    def __init__(self) -> None:
        super().__init__(
            message="User account is inactive.",
            code="INACTIVE_USER",
            status_code=403,
        )


class EmailAlreadyExistsError(AppError):
    def __init__(self) -> None:
        super().__init__(
            message="Email is already registered.",
            code="EMAIL_ALREADY_EXISTS",
            status_code=409,
        )


class SlugAlreadyExistsError(AppError):
    def __init__(self) -> None:
        super().__init__(
            message="Business slug is already taken.",
            code="SLUG_ALREADY_EXISTS",
            status_code=409,
        )
