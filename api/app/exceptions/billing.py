from app.exceptions.auth import AppError


class StripeDisabledError(AppError):
    def __init__(self) -> None:
        super().__init__(
            message="Stripe checkout is not enabled.",
            code="STRIPE_DISABLED",
            status_code=503,
        )


class InvalidCheckoutPlanError(AppError):
    def __init__(self) -> None:
        super().__init__(
            message="This plan cannot be purchased through checkout.",
            code="INVALID_CHECKOUT_PLAN",
            status_code=400,
        )


class StripePriceNotConfiguredError(AppError):
    def __init__(self) -> None:
        super().__init__(
            message="Stripe price is not configured for this plan.",
            code="STRIPE_PRICE_NOT_CONFIGURED",
            status_code=503,
        )


class StripeCheckoutCreateError(AppError):
    def __init__(self) -> None:
        super().__init__(
            message="Could not create checkout session.",
            code="STRIPE_CHECKOUT_CREATE_FAILED",
            status_code=502,
        )
