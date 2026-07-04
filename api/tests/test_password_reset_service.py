import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.auth import PasswordResetTokenInvalidError
from app.models.enums import UserRole
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.services.email_service import EmailSendResult
from app.services.password_reset_service import (
    PasswordResetService,
    hash_reset_token,
)
from app.services.password_service import hash_password, verify_password


async def _create_user(
    session: AsyncSession,
    *,
    email: str | None = None,
    password: str = "securePass123",
) -> User:
    users = UserRepository(session)
    return await users.create(
        email=email or f"reset-{uuid.uuid4().hex[:8]}@example.com",
        password_hash=hash_password(password),
        full_name="Reset Test",
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
async def test_request_reset_for_existing_user_creates_token(
    db_session: AsyncSession,
) -> None:
    user = await _create_user(db_session)
    await db_session.commit()
    service = PasswordResetService(db_session, email_service=_mock_email_service())

    with patch(
        "app.services.password_reset_service.secrets.token_urlsafe",
        return_value="reset-token-create",
    ):
        result = await service.request_password_reset(user.email)

    assert result.sent is True
    record = (
        await db_session.execute(
            select(PasswordResetToken).where(PasswordResetToken.user_id == user.id)
        )
    ).scalar_one()
    assert record.token_hash == hash_reset_token("reset-token-create")


@pytest.mark.asyncio
async def test_request_reset_sends_email_with_mocked_sender(
    db_session: AsyncSession,
) -> None:
    user = await _create_user(db_session)
    await db_session.commit()
    mock_email = _mock_email_service()
    service = PasswordResetService(db_session, email_service=mock_email)

    with patch(
        "app.services.password_reset_service.secrets.token_urlsafe",
        return_value="reset-token-email",
    ):
        await service.request_password_reset(user.email)

    mock_email.send_email.assert_called_once()
    message = mock_email.send_email.call_args[0][0]
    assert message.to_email == user.email
    assert "reset-token-email" in message.text_body


@pytest.mark.asyncio
async def test_request_reset_unknown_email_same_response_no_token(
    db_session: AsyncSession,
) -> None:
    before = (
        await db_session.execute(select(func.count()).select_from(PasswordResetToken))
    ).scalar_one()
    service = PasswordResetService(db_session, email_service=_mock_email_service())

    result = await service.request_password_reset("missing-user@example.com")

    assert result.sent is True
    after = (
        await db_session.execute(select(func.count()).select_from(PasswordResetToken))
    ).scalar_one()
    assert after == before


@pytest.mark.asyncio
async def test_raw_token_not_stored_in_db(db_session: AsyncSession) -> None:
    user = await _create_user(db_session)
    await db_session.commit()
    raw_token = "visible-reset-token"
    service = PasswordResetService(db_session, email_service=_mock_email_service())

    with patch(
        "app.services.password_reset_service.secrets.token_urlsafe",
        return_value=raw_token,
    ):
        await service.request_password_reset(user.email)

    record = (
        await db_session.execute(
            select(PasswordResetToken).where(PasswordResetToken.user_id == user.id)
        )
    ).scalar_one()
    assert record.token_hash == hash_reset_token(raw_token)
    assert record.token_hash != raw_token


@pytest.mark.asyncio
async def test_valid_token_resets_password(db_session: AsyncSession) -> None:
    user = await _create_user(db_session, password="OldPass123!")
    await db_session.commit()
    raw_token = "valid-reset-token"
    service = PasswordResetService(db_session, email_service=_mock_email_service())

    with patch(
        "app.services.password_reset_service.secrets.token_urlsafe",
        return_value=raw_token,
    ):
        await service.request_password_reset(user.email)

    await service.reset_password(raw_token, "NewPass123!")
    refreshed = (
        await db_session.execute(select(User).where(User.id == user.id))
    ).scalar_one()
    assert verify_password("NewPass123!", refreshed.password_hash or "")
    assert not verify_password("OldPass123!", refreshed.password_hash or "")


@pytest.mark.asyncio
async def test_invalid_token_raises_generic_error(db_session: AsyncSession) -> None:
    service = PasswordResetService(db_session)
    with pytest.raises(PasswordResetTokenInvalidError):
        await service.reset_password("bad-token", "NewPass123!")


@pytest.mark.asyncio
async def test_expired_token_fails(db_session: AsyncSession) -> None:
    user = await _create_user(db_session)
    await db_session.commit()
    raw_token = "expired-reset-token"
    service = PasswordResetService(db_session, email_service=_mock_email_service())

    with patch(
        "app.services.password_reset_service.secrets.token_urlsafe",
        return_value=raw_token,
    ):
        await service.request_password_reset(user.email)

    record = (
        await db_session.execute(
            select(PasswordResetToken).where(PasswordResetToken.user_id == user.id)
        )
    ).scalar_one()
    record.expires_at = datetime.now(UTC) - timedelta(hours=1)
    await db_session.commit()

    with pytest.raises(PasswordResetTokenInvalidError):
        await service.reset_password(raw_token, "NewPass123!")


@pytest.mark.asyncio
async def test_used_token_cannot_be_reused(db_session: AsyncSession) -> None:
    user = await _create_user(db_session)
    await db_session.commit()
    raw_token = "reuse-reset-token"
    service = PasswordResetService(db_session, email_service=_mock_email_service())

    with patch(
        "app.services.password_reset_service.secrets.token_urlsafe",
        return_value=raw_token,
    ):
        await service.request_password_reset(user.email)

    await service.reset_password(raw_token, "NewPass123!")
    with pytest.raises(PasswordResetTokenInvalidError):
        await service.reset_password(raw_token, "AnotherPass123!")


@pytest.mark.asyncio
async def test_request_reset_does_not_fail_when_email_send_fails(
    db_session: AsyncSession,
) -> None:
    user = await _create_user(db_session)
    await db_session.commit()
    mock_email = MagicMock()
    mock_email.send_email.side_effect = RuntimeError("smtp down")
    service = PasswordResetService(db_session, email_service=mock_email)

    result = await service.request_password_reset(user.email)

    assert result.sent is True
    count = (
        await db_session.execute(
            select(func.count()).select_from(PasswordResetToken).where(
                PasswordResetToken.user_id == user.id
            )
        )
    ).scalar_one()
    assert count == 1
