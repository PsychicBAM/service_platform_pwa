import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.auth import EmailVerificationTokenInvalidError
from app.models.email_verification_token import EmailVerificationToken
from app.models.enums import UserRole
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.services.email_service import EmailSendResult
from app.services.email_verification_service import (
    EmailVerificationService,
    hash_verification_token,
)
from app.services.password_service import hash_password


async def _create_user(session: AsyncSession, *, email: str | None = None) -> User:
    users = UserRepository(session)
    return await users.create(
        email=email or f"verify-{uuid.uuid4().hex[:8]}@example.com",
        password_hash=hash_password("securePass123"),
        full_name="Verify Test",
        phone=None,
        role=UserRole.client,
    )


def _mock_email_service(*, sent: bool = True, dry_run: bool = True) -> MagicMock:
    mock = MagicMock()
    mock.send_email.return_value = EmailSendResult(
        sent=sent,
        dry_run=dry_run,
        message="EMAIL_DRY_RUN",
        message_code="EMAIL_DRY_RUN",
    )
    return mock


@pytest.mark.asyncio
async def test_create_email_verification_token_stores_hash_not_raw(
    db_session: AsyncSession,
) -> None:
    user = await _create_user(db_session)
    raw_token = "visible-raw-token-value"
    service = EmailVerificationService(db_session)

    with patch(
        "app.services.email_verification_service.secrets.token_urlsafe",
        return_value=raw_token,
    ):
        returned = await service.create_email_verification_token(user)

    assert returned == raw_token
    record = (
        await db_session.execute(
            select(EmailVerificationToken).where(
                EmailVerificationToken.user_id == user.id
            )
        )
    ).scalar_one()
    assert record.token_hash == hash_verification_token(raw_token)
    assert record.token_hash != raw_token
    assert record.sent_to_email == user.email


@pytest.mark.asyncio
async def test_send_verification_email_best_effort_uses_mocked_sender(
    db_session: AsyncSession,
) -> None:
    user = await _create_user(db_session)
    mock_email = _mock_email_service()
    service = EmailVerificationService(db_session, email_service=mock_email)
    raw_token = await service.create_email_verification_token(user)

    sent = await service.send_verification_email_best_effort(user, raw_token)

    assert sent is True
    mock_email.send_email.assert_called_once()
    message = mock_email.send_email.call_args[0][0]
    assert message.to_email == user.email
    assert raw_token in message.text_body


@pytest.mark.asyncio
async def test_verify_valid_token_sets_email_verified_at(
    db_session: AsyncSession,
) -> None:
    user = await _create_user(db_session)
    raw_token = "valid-token-abc"
    service = EmailVerificationService(db_session)
    with patch(
        "app.services.email_verification_service.secrets.token_urlsafe",
        return_value=raw_token,
    ):
        await service.create_email_verification_token(user)
    await db_session.commit()

    verified = await service.verify_email_token(raw_token)

    assert verified.email_verified_at is not None
    refreshed = (
        await db_session.execute(select(User).where(User.id == user.id))
    ).scalar_one()
    assert refreshed.email_verified_at is not None


@pytest.mark.asyncio
async def test_verify_invalid_token_raises_generic_error(
    db_session: AsyncSession,
) -> None:
    service = EmailVerificationService(db_session)
    with pytest.raises(EmailVerificationTokenInvalidError):
        await service.verify_email_token("totally-invalid-token")


@pytest.mark.asyncio
async def test_verify_expired_token_fails(db_session: AsyncSession) -> None:
    user = await _create_user(db_session)
    raw_token = "expired-token-xyz"
    service = EmailVerificationService(db_session)
    with patch(
        "app.services.email_verification_service.secrets.token_urlsafe",
        return_value=raw_token,
    ):
        await service.create_email_verification_token(user)
    record = (
        await db_session.execute(
            select(EmailVerificationToken).where(
                EmailVerificationToken.user_id == user.id
            )
        )
    ).scalar_one()
    record.expires_at = datetime.now(UTC) - timedelta(hours=1)
    await db_session.commit()

    with pytest.raises(EmailVerificationTokenInvalidError):
        await service.verify_email_token(raw_token)


@pytest.mark.asyncio
async def test_verify_used_token_cannot_be_reused(db_session: AsyncSession) -> None:
    user = await _create_user(db_session)
    raw_token = "one-time-token"
    service = EmailVerificationService(db_session)
    with patch(
        "app.services.email_verification_service.secrets.token_urlsafe",
        return_value=raw_token,
    ):
        await service.create_email_verification_token(user)
    await db_session.commit()

    await service.verify_email_token(raw_token)

    with pytest.raises(EmailVerificationTokenInvalidError):
        await service.verify_email_token(raw_token)


@pytest.mark.asyncio
async def test_resend_for_already_verified_user(db_session: AsyncSession) -> None:
    user = await _create_user(db_session)
    user.email_verified_at = datetime.now(UTC)
    await db_session.flush()
    service = EmailVerificationService(db_session, email_service=_mock_email_service())

    result = await service.resend_email_verification(user)

    assert result.already_verified is True
    assert result.sent is False


@pytest.mark.asyncio
async def test_resend_for_unverified_user_creates_new_token(
    db_session: AsyncSession,
) -> None:
    user = await _create_user(db_session)
    mock_email = _mock_email_service()
    service = EmailVerificationService(db_session, email_service=mock_email)

    result = await service.resend_email_verification(user)

    assert result.already_verified is False
    assert result.sent is True
    count = (
        await db_session.execute(
            select(EmailVerificationToken).where(
                EmailVerificationToken.user_id == user.id
            )
        )
    ).scalars().all()
    assert len(count) == 1
    mock_email.send_email.assert_called_once()
