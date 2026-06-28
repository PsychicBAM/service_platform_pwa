import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.email_verification_token import EmailVerificationToken


class EmailVerificationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        *,
        user_id: uuid.UUID,
        token_hash: str,
        expires_at: datetime,
        sent_to_email: str | None = None,
    ) -> EmailVerificationToken:
        record = EmailVerificationToken(
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
    ) -> EmailVerificationToken | None:
        stmt = (
            select(EmailVerificationToken)
            .where(EmailVerificationToken.token_hash == token_hash)
            .where(EmailVerificationToken.used_at.is_(None))
            .where(EmailVerificationToken.expires_at > now)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def mark_used(
        self,
        record: EmailVerificationToken,
        *,
        used_at: datetime,
    ) -> None:
        record.used_at = used_at
        await self.session.flush()
