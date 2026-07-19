import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.business import get_business_for_admin_or_403
from app.dependencies.superadmin import require_superadmin
from app.models.business import Business
from app.models.enums import PlanChangeRequestStatus
from app.models.user import User
from app.schemas.plan_change_requests import (
    PlanChangeRequestCreate,
    PlanChangeRequestRead,
    PlanChangeRequestResolveResponse,
    SuperadminPlanChangeRequestListResponse,
)
from app.services.plan_change_request_service import PlanChangeRequestService

admin_router = APIRouter(prefix="/businesses", tags=["plan-change-requests"])
superadmin_router = APIRouter(prefix="/superadmin", tags=["plan-change-requests"])


@admin_router.post(
    "/{business_id}/plan-change-requests",
    response_model=PlanChangeRequestRead,
)
async def create_plan_change_request(
    business_id: uuid.UUID,
    payload: PlanChangeRequestCreate,
    business: Business = Depends(get_business_for_admin_or_403),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PlanChangeRequestRead:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    return await PlanChangeRequestService(db).create_for_business(
        business=business,
        current_user=current_user,
        payload=payload,
    )


@superadmin_router.get(
    "/plan-change-requests",
    response_model=SuperadminPlanChangeRequestListResponse,
)
async def list_plan_change_requests(
    status: PlanChangeRequestStatus | None = Query(default=PlanChangeRequestStatus.pending),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    _superadmin: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
) -> SuperadminPlanChangeRequestListResponse:
    return await PlanChangeRequestService(db).list_for_superadmin(
        status=status,
        page=page,
        limit=limit,
    )


@superadmin_router.post(
    "/plan-change-requests/{request_id}/approve",
    response_model=PlanChangeRequestResolveResponse,
)
async def approve_plan_change_request(
    request_id: uuid.UUID,
    superadmin: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
) -> PlanChangeRequestResolveResponse:
    return await PlanChangeRequestService(db).approve(
        request_id=request_id,
        actor_user_id=superadmin.id,
    )


@superadmin_router.post(
    "/plan-change-requests/{request_id}/reject",
    response_model=PlanChangeRequestResolveResponse,
)
async def reject_plan_change_request(
    request_id: uuid.UUID,
    superadmin: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
) -> PlanChangeRequestResolveResponse:
    return await PlanChangeRequestService(db).reject(
        request_id=request_id,
        actor_user_id=superadmin.id,
    )
