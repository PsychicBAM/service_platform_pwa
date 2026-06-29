import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


class AuditLogRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        *,
        actor_user_id: uuid.UUID | None,
        business_id: uuid.UUID | None,
        action: str,
        target_type: str | None = None,
        target_id: uuid.UUID | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> AuditLog:
        log = AuditLog(
            actor_user_id=actor_user_id,
            business_id=business_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            log_metadata=metadata or {},
        )
        self.session.add(log)
        await self.session.flush()
        return log

    async def list_logs(
        self,
        *,
        business_id: uuid.UUID | None = None,
        action: str | None = None,
        page: int = 1,
        limit: int = 50,
    ) -> list[AuditLog]:
        stmt = select(AuditLog)
        stmt = self._apply_filters(stmt, business_id=business_id, action=action)
        stmt = stmt.order_by(AuditLog.created_at.desc())
        offset = max(page - 1, 0) * limit
        stmt = stmt.offset(offset).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_logs(
        self,
        *,
        business_id: uuid.UUID | None = None,
        action: str | None = None,
    ) -> int:
        stmt = select(func.count()).select_from(AuditLog)
        stmt = self._apply_filters(stmt, business_id=business_id, action=action)
        result = await self.session.execute(stmt)
        return int(result.scalar_one())

    def _apply_filters(self, stmt, *, business_id: uuid.UUID | None, action: str | None):
        if business_id is not None:
            stmt = stmt.where(AuditLog.business_id == business_id)
        if action:
            stmt = stmt.where(AuditLog.action == action)
        return stmt

    async def has_metadata_value(self, *, metadata_key: str, metadata_value: str) -> bool:
        stmt = (
            select(AuditLog.id)
            .where(AuditLog.log_metadata[metadata_key].astext == metadata_value)
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none() is not None
