import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.password_reset_token import PasswordResetToken


class PasswordResetRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        *,
        user_id: uuid.UUID,
        token_hash: str,
        expires_at: datetime,
        sent_to_email: str | None = None,
    ) -> PasswordResetToken:
        record = PasswordResetToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
            sent_to_email=sent_to_email,
        )
        self.session.add(record)
        await self.session.flush()
        return record

    async def get_valid_by_token_hash(
        self,
        token_hash: str,
        *,
        now: datetime,
    ) -> PasswordResetToken | None:
        stmt = (
            select(PasswordResetToken)
            .where(PasswordResetToken.token_hash == token_hash)
            .where(PasswordResetToken.used_at.is_(None))
            .where(PasswordResetToken.expires_at > now)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def mark_used(
        self,
        record: PasswordResetToken,
        *,
        used_at: datetime,
    ) -> None:
        record.used_at = used_at
        await self.session.flush()
