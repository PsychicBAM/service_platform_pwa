from __future__ import annotations

import logging
import smtplib
from dataclasses import dataclass
from email.message import EmailMessage as MimeEmailMessage

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class EmailMessage:
    to_email: str
    subject: str
    text_body: str
    html_body: str | None = None


@dataclass(frozen=True)
class EmailSendResult:
    sent: bool
    dry_run: bool
    message: str


class EmailService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def send_email(self, message: EmailMessage) -> EmailSendResult:
        if not self.settings.email_enabled:
            return EmailSendResult(
                sent=False,
                dry_run=True,
                message="Email disabled",
            )

        if self.settings.email_dry_run:
            logger.info(
                "Email dry-run: to=%s subject=%s",
                message.to_email,
                message.subject,
            )
            return EmailSendResult(
                sent=True,
                dry_run=True,
                message="Email dry-run (not sent)",
            )

        config_error = self._smtp_config_error()
        if config_error is not None:
            logger.warning("Email not sent: %s", config_error)
            return EmailSendResult(
                sent=False,
                dry_run=False,
                message=config_error,
            )

        try:
            self._send_via_smtp(message)
        except smtplib.SMTPException:
            logger.exception("SMTP send failed for %s", message.to_email)
            return EmailSendResult(
                sent=False,
                dry_run=False,
                message="Failed to send email",
            )
        except OSError:
            logger.exception("SMTP connection failed for %s", message.to_email)
            return EmailSendResult(
                sent=False,
                dry_run=False,
                message="Failed to connect to SMTP server",
            )
        except Exception:
            logger.exception("Unexpected email send failure for %s", message.to_email)
            return EmailSendResult(
                sent=False,
                dry_run=False,
                message="Failed to send email",
            )

        return EmailSendResult(
            sent=True,
            dry_run=False,
            message="Email sent",
        )

    def _smtp_config_error(self) -> str | None:
        if not self.settings.smtp_host:
            return "SMTP_HOST is not configured"
        if not self.settings.smtp_from_email:
            return "SMTP_FROM_EMAIL is not configured"
        if self.settings.smtp_user and not self.settings.smtp_password:
            return "SMTP_PASSWORD is required when SMTP_USER is set"
        return None

    def _send_via_smtp(self, message: EmailMessage) -> None:
        mime = MimeEmailMessage()
        from_header = self._format_from_header()
        mime["From"] = from_header
        mime["To"] = message.to_email
        mime["Subject"] = message.subject
        if message.html_body:
            mime.set_content(message.text_body)
            mime.add_alternative(message.html_body, subtype="html")
        else:
            mime.set_content(message.text_body)

        host = self.settings.smtp_host
        assert host is not None
        port = self.settings.smtp_port

        if self.settings.smtp_use_tls:
            with smtplib.SMTP(host, port, timeout=30) as smtp:
                smtp.starttls()
                self._login_if_needed(smtp)
                smtp.send_message(mime)
        else:
            with smtplib.SMTP(host, port, timeout=30) as smtp:
                self._login_if_needed(smtp)
                smtp.send_message(mime)

    def _login_if_needed(self, smtp: smtplib.SMTP) -> None:
        if self.settings.smtp_user:
            password = self.settings.smtp_password or ""
            smtp.login(self.settings.smtp_user, password)

    def _format_from_header(self) -> str:
        from_email = self.settings.smtp_from_email or ""
        from_name = self.settings.smtp_from_name.strip()
        if from_name:
            return f"{from_name} <{from_email}>"
        return from_email
