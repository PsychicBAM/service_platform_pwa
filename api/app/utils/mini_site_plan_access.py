"""Plan-based access rules for mini-site config saves and page variant."""

from __future__ import annotations

from app.exceptions.business import ValidationAppError
from app.models.enums import PublicPageVariant, SubscriptionPlan
from app.schemas.mini_site import MiniSiteTemplate

_PRO_TEMPLATES = frozenset(
    {"clean", "service", "expert", "clinic", "portfolio", "teacher", "coach"}
)
_BUSINESS_TEMPLATES = frozenset({"clean"})


def normalize_mini_site_template_key(template: MiniSiteTemplate | str | None) -> str:
    if template is None:
        return ""
    raw = getattr(template, "value", None) or str(template)
    return str(raw).strip().lower()


def allowed_mini_site_templates(plan: SubscriptionPlan | None) -> frozenset[str]:
    if plan == SubscriptionPlan.pro:
        return _PRO_TEMPLATES
    if plan == SubscriptionPlan.business:
        return _BUSINESS_TEMPLATES
    return frozenset()


def assert_mini_site_template_allowed(
    plan: SubscriptionPlan | None,
    template: MiniSiteTemplate | str,
) -> None:
    """Raise ValidationAppError when the plan cannot save the given template."""
    template_key = normalize_mini_site_template_key(template)
    allowed = allowed_mini_site_templates(plan)
    if template_key in allowed:
        return

    if plan in (None, SubscriptionPlan.free, SubscriptionPlan.starter):
        raise ValidationAppError(
            "Mini-site templates require the Business plan (Clean) or Pro. "
            "You can keep the Default business profile on any plan."
        )
    if plan == SubscriptionPlan.business:
        raise ValidationAppError(
            "Your Business plan can only use the Clean mini-site template. Upgrade to Pro for more templates."
        )
    raise ValidationAppError("This mini-site template is not available on your current plan.")


def assert_public_page_variant_allowed(
    plan: SubscriptionPlan | None,
    variant: PublicPageVariant | str,
) -> None:
    """Standard (Default business profile) is always allowed; mini_site needs Business/Pro."""
    key = getattr(variant, "value", None) or str(variant)
    key = str(key).strip().lower()
    if key == PublicPageVariant.standard.value:
        return
    if key == PublicPageVariant.mini_site.value:
        if plan in (SubscriptionPlan.business, SubscriptionPlan.pro):
            return
        raise ValidationAppError(
            "Mini-site layout requires the Business plan (Clean) or Pro. "
            "You can use the Default business profile on any plan."
        )
    raise ValidationAppError("Invalid public page variant.")
