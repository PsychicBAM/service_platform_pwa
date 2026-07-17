from __future__ import annotations

from app.services.email_service import EmailMessage


def _format_status_label(status: str) -> str:
    return status.replace("_", " ").title()


def build_admin_booking_created_email(
    *,
    to_email: str,
    business_name: str,
    service_name: str,
    reference: str,
    client_name: str,
    starts_at_label: str,
    status_label: str,
) -> EmailMessage:
    subject = f"New booking — {reference}"
    text_body = (
        f"A new booking was submitted for {business_name}.\n\n"
        f"Reference: {reference}\n"
        f"Service: {service_name}\n"
        f"Client: {client_name}\n"
        f"Starts: {starts_at_label}\n"
        f"Status: {status_label}\n"
    )
    return EmailMessage(to_email=to_email, subject=subject, text_body=text_body)


def build_client_booking_confirmed_email(
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
    return EmailMessage(to_email=to_email, subject=subject, text_body=text_body)


def build_booking_confirmation_email(
    *,
    to_email: str,
    recipient_name: str,
    business_name: str,
    service_name: str,
    reference: str,
    starts_at_label: str,
) -> EmailMessage:
    return build_client_booking_confirmed_email(
        to_email=to_email,
        recipient_name=recipient_name,
        business_name=business_name,
        service_name=service_name,
        reference=reference,
        starts_at_label=starts_at_label,
    )


def build_client_booking_cancelled_email(
    *,
    to_email: str,
    recipient_name: str,
    business_name: str,
    service_name: str,
    reference: str,
    starts_at_label: str,
) -> EmailMessage:
    subject = f"Booking cancelled — {reference}"
    text_body = (
        f"Hello {recipient_name},\n\n"
        f"Your booking at {business_name} has been cancelled.\n\n"
        f"Reference: {reference}\n"
        f"Service: {service_name}\n"
        f"Was scheduled: {starts_at_label}\n"
    )
    return EmailMessage(to_email=to_email, subject=subject, text_body=text_body)


def build_admin_order_submitted_email(
    *,
    to_email: str,
    business_name: str,
    service_name: str,
    reference: str,
    client_name: str,
) -> EmailMessage:
    subject = f"New request — {reference}"
    text_body = (
        f"A new service request was submitted for {business_name}.\n\n"
        f"Reference: {reference}\n"
        f"Service: {service_name}\n"
        f"Client: {client_name}\n"
        f"Status: Submitted\n"
    )
    return EmailMessage(to_email=to_email, subject=subject, text_body=text_body)


def build_client_order_status_changed_email(
    *,
    to_email: str,
    recipient_name: str,
    business_name: str,
    service_name: str,
    reference: str,
    status_label: str,
) -> EmailMessage:
    subject = f"Request update — {reference}"
    text_body = (
        f"Hello {recipient_name},\n\n"
        f"Your request at {business_name} has been updated.\n\n"
        f"Reference: {reference}\n"
        f"Service: {service_name}\n"
        f"Status: {status_label}\n"
    )
    return EmailMessage(to_email=to_email, subject=subject, text_body=text_body)


def build_client_order_message_email(
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
    return EmailMessage(to_email=to_email, subject=subject, text_body=text_body)


def build_order_message_email(
    *,
    to_email: str,
    recipient_name: str,
    business_name: str,
    reference: str,
    message_preview: str,
) -> EmailMessage:
    return build_client_order_message_email(
        to_email=to_email,
        recipient_name=recipient_name,
        business_name=business_name,
        reference=reference,
        message_preview=message_preview,
    )


def build_admin_order_message_email(
    *,
    to_email: str,
    business_name: str,
    reference: str,
    client_name: str,
    message_preview: str,
) -> EmailMessage:
    preview = message_preview.strip()
    if len(preview) > 200:
        preview = f"{preview[:197]}..."
    subject = f"Client message on request {reference}"
    text_body = (
        f"A client sent a new message for {business_name}.\n\n"
        f"Reference: {reference}\n"
        f"Client: {client_name}\n"
        f"Preview: {preview}\n"
    )
    return EmailMessage(to_email=to_email, subject=subject, text_body=text_body)


def build_email_verification_email(
    *,
    user_email: str,
    verification_url: str,
    expire_hours: int,
) -> EmailMessage:
    subject = "Verify your email"
    text_body = (
        "Hello,\n\n"
        f"Please verify your email address ({user_email}) by opening this link:\n\n"
        f"{verification_url}\n\n"
        f"This link expires in {expire_hours} hours.\n\n"
        "If you did not create an account, you can ignore this email.\n"
    )
    return EmailMessage(to_email=user_email, subject=subject, text_body=text_body)


def build_password_reset_email(
    *,
    user_email: str,
    reset_url: str,
    expire_hours: int,
) -> EmailMessage:
    subject = "Reset your password"
    text_body = (
        "Hello,\n\n"
        f"We received a request to reset the password for {user_email}.\n\n"
        f"Open this link to choose a new password:\n\n"
        f"{reset_url}\n\n"
        f"This link expires in {expire_hours} hours.\n\n"
        "If you did not request a password reset, you can ignore this email.\n"
    )
    return EmailMessage(to_email=user_email, subject=subject, text_body=text_body)


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


def build_client_review_request_email(
    *,
    to_email: str,
    recipient_name: str,
    business_name: str,
    reference: str | None,
    review_url: str,
    expire_days: int,
) -> EmailMessage:
    greeting_name = recipient_name.strip() or "there"
    subject = f"How was your visit with {business_name}?"
    reference_line = f"Reference: {reference}\n" if reference else ""
    text_body = (
        f"Hello {greeting_name},\n\n"
        f"Thank you for choosing {business_name}. "
        "We would appreciate a short review when you have a moment.\n\n"
        f"{reference_line}"
        f"Leave your review here:\n{review_url}\n\n"
        f"This link expires in {expire_days} days.\n\n"
        "If you were not expecting this email, you can ignore it.\n"
    )
    html_body = (
        f"<p>Hello {greeting_name},</p>"
        f"<p>Thank you for choosing <strong>{business_name}</strong>. "
        "We would appreciate a short review when you have a moment.</p>"
        + (f"<p>Reference: {reference}</p>" if reference else "")
        + f'<p><a href="{review_url}">Leave your review</a></p>'
        f"<p>This link expires in {expire_days} days.</p>"
        "<p>If you were not expecting this email, you can ignore it.</p>"
    )
    return EmailMessage(
        to_email=to_email,
        subject=subject,
        text_body=text_body,
        html_body=html_body,
    )
