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
    def __init__(
        self,
        message: str = "Email is already registered.",
    ) -> None:
        super().__init__(
            message=message,
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


class EmailVerificationTokenInvalidError(AppError):
    def __init__(self) -> None:
        super().__init__(
            message="Verification link is invalid or expired.",
            code="EMAIL_VERIFICATION_TOKEN_INVALID",
            status_code=400,
        )


class EmailVerificationRequiredError(AppError):
    def __init__(self) -> None:
        super().__init__(
            message="Please verify your email before logging in.",
            code="EMAIL_VERIFICATION_REQUIRED",
            status_code=403,
        )


class PasswordResetTokenInvalidError(AppError):
    def __init__(self) -> None:
        super().__init__(
            message="Password reset link is invalid or expired.",
            code="PASSWORD_RESET_TOKEN_INVALID",
            status_code=400,
        )
