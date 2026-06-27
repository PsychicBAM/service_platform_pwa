from app.services.email_templates import (
    build_booking_confirmation_email,
    build_claim_help_email,
    build_order_message_email,
)


def test_booking_confirmation_template_includes_reference_and_service() -> None:
    message = build_booking_confirmation_email(
        to_email="guest@example.com",
        recipient_name="Jane Doe",
        business_name="Demo Business",
        service_name="Arabic Lesson",
        reference="BKG-2026-0001",
        starts_at_label="July 1, 2026 10:00 AM",
    )

    assert message.to_email == "guest@example.com"
    assert "BKG-2026-0001" in message.subject
    assert "BKG-2026-0001" in message.text_body
    assert "Arabic Lesson" in message.text_body
    assert "Demo Business" in message.text_body
    assert "password" not in message.text_body.lower()


def test_order_message_template_includes_reference() -> None:
    message = build_order_message_email(
        to_email="client@example.com",
        recipient_name="Client Demo",
        business_name="Demo Business",
        reference="ORD-2026-0002",
        message_preview="We need a few more details about your project.",
    )

    assert "ORD-2026-0002" in message.subject
    assert "ORD-2026-0002" in message.text_body
    assert "We need a few more details" in message.text_body


def test_claim_help_template_includes_reference_and_guidance_without_secrets() -> None:
    message = build_claim_help_email(
        to_email="john.demo@example.com",
        reference="BKG-2026-0003",
        claim_url="https://app.example.com/me/claim",
    )

    assert "BKG-2026-0003" in message.subject
    assert "BKG-2026-0003" in message.text_body
    assert "/me/claim" in message.text_body
    assert "email or phone" in message.text_body.lower()
    assert "password" not in message.text_body.lower()
    assert "smtp" not in message.text_body.lower()
