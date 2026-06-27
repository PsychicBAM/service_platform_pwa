import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.audit_log_repository import AuditLogRepository
from app.schemas.superadmin import AuditLogListResponse, AuditLogRead, SuperadminListMeta


class AuditLogService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = AuditLogRepository(session)

    async def create_audit_log(
        self,
        *,
        actor_user_id: uuid.UUID | None,
        business_id: uuid.UUID | None,
        action: str,
        target_type: str | None = None,
        target_id: uuid.UUID | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> AuditLogRead:
        log = await self.repo.create(
            actor_user_id=actor_user_id,
            business_id=business_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            metadata=metadata,
        )
        return AuditLogRead.from_audit_log(log)

    async def list_audit_logs(
        self,
        *,
        business_id: uuid.UUID | None = None,
        action: str | None = None,
        page: int = 1,
        limit: int = 50,
    ) -> AuditLogListResponse:
        logs = await self.repo.list_logs(
            business_id=business_id,
            action=action,
            page=page,
            limit=limit,
        )
        total = await self.repo.count_logs(business_id=business_id, action=action)
        return AuditLogListResponse(
            data=[AuditLogRead.from_audit_log(log) for log in logs],
            meta=SuperadminListMeta(page=page, limit=limit, total=total),
        )
