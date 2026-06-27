import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.superadmin import require_superadmin
from app.models.enums import BusinessStatus, SubscriptionPlan
from app.models.user import User
from app.schemas.superadmin import (
    AuditLogListResponse,
    SuperadminBusinessDetail,
    SuperadminBusinessListResponse,
    SuperadminBusinessUpdate,
)
from app.services.audit_log_service import AuditLogService
from app.services.superadmin_service import SuperadminService

router = APIRouter(prefix="/superadmin", tags=["superadmin"])


@router.get("/businesses", response_model=SuperadminBusinessListResponse)
async def list_businesses(
    search: str | None = Query(default=None),
    status: BusinessStatus | None = Query(default=None),
    plan: SubscriptionPlan | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    _superadmin: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
) -> SuperadminBusinessListResponse:
    return await SuperadminService(db).list_businesses(
        search=search,
        status=status,
        plan=plan,
        page=page,
        limit=limit,
    )


@router.get("/businesses/{business_id}", response_model=SuperadminBusinessDetail)
async def get_business(
    business_id: uuid.UUID,
    _superadmin: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
) -> SuperadminBusinessDetail:
    return await SuperadminService(db).get_business_detail(business_id)


@router.patch("/businesses/{business_id}", response_model=SuperadminBusinessDetail)
async def update_business(
    business_id: uuid.UUID,
    payload: SuperadminBusinessUpdate,
    superadmin: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
) -> SuperadminBusinessDetail:
    return await SuperadminService(db).update_business_admin_fields(
        business_id,
        payload,
        actor_user_id=superadmin.id,
    )


@router.get("/audit-logs", response_model=AuditLogListResponse)
async def list_audit_logs(
    business_id: uuid.UUID | None = Query(default=None),
    action: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    _superadmin: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
) -> AuditLogListResponse:
    return await AuditLogService(db).list_audit_logs(
        business_id=business_id,
        action=action,
        page=page,
        limit=limit,
    )
