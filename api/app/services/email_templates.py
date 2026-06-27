from __future__ import annotations

from app.services.email_service import EmailMessage


def build_booking_confirmation_email(
    *,
    to_email: str,
    recipient_name: str,
    business_name: str,
    service_name: str,
    reference: str,
    starts_at_label: str,
) -> EmailMessage:
    subject = f"Booking confirmed — {reference}"
    text_body = (
        f"Hello {recipient_name},\n\n"
        f"Your booking at {business_name} is confirmed.\n\n"
        f"Reference: {reference}\n"
        f"Service: {service_name}\n"
        f"Starts: {starts_at_label}\n\n"
        "Keep this reference for your records.\n"
    )
    return EmailMessage(
        to_email=to_email,
        subject=subject,
        text_body=text_body,
    )


def build_order_message_email(
    *,
    to_email: str,
    recipient_name: str,
    business_name: str,
    reference: str,
    message_preview: str,
) -> EmailMessage:
    preview = message_preview.strip()
    if len(preview) > 200:
        preview = f"{preview[:197]}..."
    subject = f"New message on request {reference}"
    text_body = (
        f"Hello {recipient_name},\n\n"
        f"You have a new message from {business_name} about request {reference}.\n\n"
        f"Preview: {preview}\n\n"
        "Sign in to your account to read and reply.\n"
    )
    return EmailMessage(
        to_email=to_email,
        subject=subject,
        text_body=text_body,
    )


def build_claim_help_email(
    *,
    to_email: str,
    reference: str,
    claim_url: str,
) -> EmailMessage:
    subject = f"Link your guest booking or request — {reference}"
    text_body = (
        f"Reference: {reference}\n\n"
        "To link a guest booking or request to your account:\n"
        f"1. Open {claim_url}\n"
        "2. Sign in or create an account\n"
        "3. Enter the reference above and the same email or phone you used as a guest\n\n"
        "Do not share this email if it contains personal contact details.\n"
    )
    return EmailMessage(
        to_email=to_email,
        subject=subject,
        text_body=text_body,
    )
