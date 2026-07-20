"""Safe per-business notification email templates (placeholder replacement only)."""

from __future__ import annotations

import re
from html import escape
from typing import Any

REVIEW_REQUEST_TEMPLATE_KEY = "review_request"

REVIEW_REQUEST_ALLOWED_VARIABLES = frozenset(
    {
        "business_name",
        "client_name",
        "service_name",
        "review_link",
        "booking_reference",
        "order_reference",
        "request_reference",
        "business_public_url",
        "expire_days",
    }
)

DEFAULT_REVIEW_REQUEST_SUBJECT = "Review your experience with {business_name}"
DEFAULT_REVIEW_REQUEST_BODY = (
    "Hi {client_name},\n\n"
    "Thank you for choosing {business_name}.\n\n"
    "Please leave a review for your recent {service_name}.\n\n"
    "Review link:\n{review_link}\n\n"
    "This link expires in {expire_days} days.\n\n"
    "Thank you,\n{business_name}"
)

DEFAULT_NOTIFICATION_TEMPLATES: dict[str, dict[str, Any]] = {
    REVIEW_REQUEST_TEMPLATE_KEY: {
        "subject": DEFAULT_REVIEW_REQUEST_SUBJECT,
        "body": DEFAULT_REVIEW_REQUEST_BODY,
        "enabled": True,
    }
}

_PLACEHOLDER_RE = re.compile(r"\{([a-zA-Z_][a-zA-Z0-9_]*)\}")


def extract_template_variables(text: str) -> set[str]:
    return set(_PLACEHOLDER_RE.findall(text or ""))


def validate_template_text(text: str, *, allowed: frozenset[str]) -> list[str]:
    unknown = sorted(extract_template_variables(text) - allowed)
    return unknown


def render_template(text: str, values: dict[str, str]) -> str:
    """Replace {placeholders} safely. Unknown keys stay as-is; missing values become ''."""

    def replacer(match: re.Match[str]) -> str:
        key = match.group(1)
        if key in values:
            return values[key]
        return match.group(0)

    return _PLACEHOLDER_RE.sub(replacer, text or "")


def default_review_request_template() -> dict[str, Any]:
    return dict(DEFAULT_NOTIFICATION_TEMPLATES[REVIEW_REQUEST_TEMPLATE_KEY])


def resolve_notification_templates(settings: dict[str, Any] | None) -> dict[str, dict[str, Any]]:
    raw = (settings or {}).get("notification_templates")
    templates: dict[str, dict[str, Any]] = {
        REVIEW_REQUEST_TEMPLATE_KEY: default_review_request_template(),
    }
    if not isinstance(raw, dict):
        return templates

    review = raw.get(REVIEW_REQUEST_TEMPLATE_KEY)
    if isinstance(review, dict):
        subject = str(review.get("subject") or DEFAULT_REVIEW_REQUEST_SUBJECT).strip()
        body = str(review.get("body") or DEFAULT_REVIEW_REQUEST_BODY).strip()
        enabled = bool(review.get("enabled", True))
        templates[REVIEW_REQUEST_TEMPLATE_KEY] = {
            "subject": subject or DEFAULT_REVIEW_REQUEST_SUBJECT,
            "body": body or DEFAULT_REVIEW_REQUEST_BODY,
            "enabled": enabled,
        }
    return templates


def normalize_notification_templates_patch(
    value: dict[str, Any] | None,
) -> dict[str, dict[str, Any]] | None:
    if value is None:
        return None
    if not isinstance(value, dict):
        raise ValueError("notification_templates must be an object")

    normalized: dict[str, dict[str, Any]] = {}
    if REVIEW_REQUEST_TEMPLATE_KEY in value:
        item = value[REVIEW_REQUEST_TEMPLATE_KEY]
        if not isinstance(item, dict):
            raise ValueError("notification_templates.review_request must be an object")
        subject = str(item.get("subject") or "").strip()
        body = str(item.get("body") or "").strip()
        if not subject:
            raise ValueError("review_request subject is required")
        if not body:
            raise ValueError("review_request body is required")
        if len(subject) > 200:
            raise ValueError("review_request subject must be at most 200 characters")
        if len(body) > 5000:
            raise ValueError("review_request body must be at most 5000 characters")
        unknown_subject = validate_template_text(
            subject, allowed=REVIEW_REQUEST_ALLOWED_VARIABLES
        )
        unknown_body = validate_template_text(body, allowed=REVIEW_REQUEST_ALLOWED_VARIABLES)
        unknown = sorted(set(unknown_subject + unknown_body))
        if unknown:
            raise ValueError(
                "Unknown template variables: " + ", ".join(f"{{{name}}}" for name in unknown)
            )
        normalized[REVIEW_REQUEST_TEMPLATE_KEY] = {
            "subject": subject,
            "body": body,
            "enabled": bool(item.get("enabled", True)),
        }

    # Preserve only known keys for now.
    return normalized or None


def build_review_request_variable_map(
    *,
    business_name: str,
    client_name: str,
    service_name: str | None,
    review_url: str,
    reference: str | None,
    target_type: str,
    expire_days: int,
    business_public_url: str | None = None,
) -> dict[str, str]:
    safe_client = (client_name or "").strip() or "there"
    safe_service = (service_name or "").strip() or (
        "request" if target_type == "order" else "booking"
    )
    safe_reference = (reference or "").strip()
    values = {
        "business_name": business_name,
        "client_name": safe_client,
        "service_name": safe_service,
        "review_link": review_url,
        "expire_days": str(expire_days),
        "business_public_url": (business_public_url or "").strip(),
        "booking_reference": safe_reference if target_type == "booking" else "",
        "order_reference": safe_reference if target_type == "order" else "",
        "request_reference": safe_reference if target_type == "order" else "",
    }
    return values


def plaintext_to_simple_html(text: str) -> str:
    escaped = escape(text)
    paragraphs = [part.strip() for part in escaped.split("\n\n") if part.strip()]
    if not paragraphs:
        return f"<p>{escaped}</p>"
    html_parts: list[str] = []
    for paragraph in paragraphs:
        html_parts.append("<p>" + paragraph.replace("\n", "<br>") + "</p>")
    return "".join(html_parts)
