import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.exceptions.business import (
    BusinessNotFoundError,
    PlanChangeRequestInvalidError,
    PlanChangeRequestNotFoundError,
    PlanChangeRequestNotPendingError,
)
from app.models.business import Business
from app.models.enums import (
    PlanChangeDirection,
    PlanChangeRequestStatus,
    SubscriptionPlan,
)
from app.models.plan_change_request import PlanChangeRequest
from app.models.user import User
from app.repositories.business_repository import BusinessRepository
from app.schemas.plan_change_requests import (
    PlanChangeRequestCreate,
    PlanChangeRequestRead,
    PlanChangeRequestResolveResponse,
    SuperadminPlanChangeRequestListResponse,
    SuperadminPlanChangeRequestListMeta,
    SuperadminPlanChangeRequestRead,
)
from app.services.audit_log_service import AuditLogService

PLAN_RANK: dict[SubscriptionPlan, int] = {
    SubscriptionPlan.free: 0,
    SubscriptionPlan.starter: 1,
    SubscriptionPlan.business: 2,
    SubscriptionPlan.pro: 3,
}


def resolve_plan_change_direction(
    current_plan: SubscriptionPlan,
    requested_plan: SubscriptionPlan,
) -> PlanChangeDirection:
    current_rank = PLAN_RANK[current_plan]
    requested_rank = PLAN_RANK[requested_plan]
    if requested_rank > current_rank:
        return PlanChangeDirection.upgrade
    if requested_rank < current_rank:
        return PlanChangeDirection.downgrade
    return PlanChangeDirection.change


class PlanChangeRequestService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.business_repo = BusinessRepository(session)
        self.audit = AuditLogService(session)

    async def create_for_business(
        self,
        *,
        business: Business,
        current_user: User,
        payload: PlanChangeRequestCreate,
    ) -> PlanChangeRequestRead:
        subscription = await self.business_repo.get_subscription(business.id)
        if subscription is None:
            raise BusinessNotFoundError("Subscription not found for business.")

        current_plan = subscription.plan
        requested_plan = payload.requested_plan
        if requested_plan == current_plan:
            raise PlanChangeRequestInvalidError(
                "You are already on this plan. Choose a different plan."
            )

        direction = resolve_plan_change_direction(current_plan, requested_plan)
        existing = await self._get_pending_for_business(business.id)

        if existing is not None:
            existing.current_plan = current_plan
            existing.requested_plan = requested_plan
            existing.direction = direction
            existing.requested_by_user_id = current_user.id
            existing.note = payload.note
            request = existing
            action = "plan_change_request.updated"
        else:
            request = PlanChangeRequest(
                business_id=business.id,
                requested_by_user_id=current_user.id,
                current_plan=current_plan,
                requested_plan=requested_plan,
                direction=direction,
                status=PlanChangeRequestStatus.pending,
                note=payload.note,
            )
            self.session.add(request)
            action = "plan_change_request.created"

        await self.session.flush()
        await self.audit.create_audit_log(
            actor_user_id=current_user.id,
            business_id=business.id,
            action=action,
            target_type="plan_change_request",
            target_id=request.id,
            metadata={
                "current_plan": current_plan.value,
                "requested_plan": requested_plan.value,
                "direction": direction.value,
                "status": request.status.value,
            },
        )
        await self.session.commit()
        await self.session.refresh(request)
        return PlanChangeRequestRead.model_validate(request)

    async def list_for_superadmin(
        self,
        *,
        status: PlanChangeRequestStatus | None = PlanChangeRequestStatus.pending,
        page: int = 1,
        limit: int = 50,
    ) -> SuperadminPlanChangeRequestListResponse:
        filters = []
        if status is not None:
            filters.append(PlanChangeRequest.status == status)

        count_stmt = select(func.count()).select_from(PlanChangeRequest)
        if filters:
            count_stmt = count_stmt.where(*filters)
        total = int((await self.session.execute(count_stmt)).scalar_one())

        stmt = (
            select(PlanChangeRequest)
            .options(selectinload(PlanChangeRequest.business))
            .order_by(PlanChangeRequest.created_at.desc())
        )
        if filters:
            stmt = stmt.where(*filters)
        offset = max(page - 1, 0) * limit
        stmt = stmt.offset(offset).limit(limit)
        rows = (await self.session.execute(stmt)).scalars().all()

        return SuperadminPlanChangeRequestListResponse(
            data=[self._to_superadmin_read(row) for row in rows],
            meta=SuperadminPlanChangeRequestListMeta(page=page, limit=limit, total=total),
        )

    async def get_pending_for_business(
        self,
        business_id: uuid.UUID,
    ) -> SuperadminPlanChangeRequestRead | None:
        request = await self._get_pending_for_business(business_id)
        if request is None:
            return None
        await self.session.refresh(request, attribute_names=["business"])
        # Ensure business is loaded
        business = await self.business_repo.get_by_id(business_id)
        if business is None:
            return None
        request.business = business
        return self._to_superadmin_read(request)

    async def approve(
        self,
        *,
        request_id: uuid.UUID,
        actor_user_id: uuid.UUID,
    ) -> PlanChangeRequestResolveResponse:
        request = await self._get_request_or_404(request_id)
        if request.status != PlanChangeRequestStatus.pending:
            raise PlanChangeRequestNotPendingError()

        subscription = await self.business_repo.get_subscription(request.business_id)
        if subscription is None:
            raise BusinessNotFoundError("Subscription not found for business.")

        old_plan = subscription.plan
        await self.business_repo.update_subscription(
            subscription,
            {"plan": request.requested_plan},
        )
        request.status = PlanChangeRequestStatus.approved
        request.resolved_at = datetime.now(UTC)
        request.resolved_by_user_id = actor_user_id
        request.current_plan = old_plan

        await self.audit.create_audit_log(
            actor_user_id=actor_user_id,
            business_id=request.business_id,
            action="plan_change_request.approved",
            target_type="plan_change_request",
            target_id=request.id,
            metadata={
                "old_plan": old_plan.value,
                "new_plan": request.requested_plan.value,
                "direction": request.direction.value,
                "change_source": "superadmin_plan_change_request",
            },
        )
        await self.audit.create_audit_log(
            actor_user_id=actor_user_id,
            business_id=request.business_id,
            action="subscription.plan_changed",
            target_type="subscription",
            target_id=subscription.id,
            metadata={
                "old_plan": old_plan.value,
                "new_plan": request.requested_plan.value,
                "change_source": "superadmin_plan_change_request",
                "plan_change_request_id": str(request.id),
            },
        )
        await self.session.commit()
        await self.session.refresh(request)
        business = await self.business_repo.get_by_id(request.business_id)
        if business is None:
            raise BusinessNotFoundError()
        request.business = business
        return PlanChangeRequestResolveResponse(
            request=self._to_superadmin_read(request),
            business_plan=request.requested_plan,
        )

    async def reject(
        self,
        *,
        request_id: uuid.UUID,
        actor_user_id: uuid.UUID,
    ) -> PlanChangeRequestResolveResponse:
        request = await self._get_request_or_404(request_id)
        if request.status != PlanChangeRequestStatus.pending:
            raise PlanChangeRequestNotPendingError()

        subscription = await self.business_repo.get_subscription(request.business_id)
        current_plan = subscription.plan if subscription is not None else request.current_plan

        request.status = PlanChangeRequestStatus.rejected
        request.resolved_at = datetime.now(UTC)
        request.resolved_by_user_id = actor_user_id

        await self.audit.create_audit_log(
            actor_user_id=actor_user_id,
            business_id=request.business_id,
            action="plan_change_request.rejected",
            target_type="plan_change_request",
            target_id=request.id,
            metadata={
                "current_plan": request.current_plan.value,
                "requested_plan": request.requested_plan.value,
                "direction": request.direction.value,
            },
        )
        await self.session.commit()
        await self.session.refresh(request)
        business = await self.business_repo.get_by_id(request.business_id)
        if business is None:
            raise BusinessNotFoundError()
        request.business = business
        return PlanChangeRequestResolveResponse(
            request=self._to_superadmin_read(request),
            business_plan=current_plan,
        )

    async def _get_pending_for_business(
        self,
        business_id: uuid.UUID,
    ) -> PlanChangeRequest | None:
        stmt = (
            select(PlanChangeRequest)
            .where(
                PlanChangeRequest.business_id == business_id,
                PlanChangeRequest.status == PlanChangeRequestStatus.pending,
            )
            .order_by(PlanChangeRequest.created_at.desc())
            .limit(1)
        )
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def _get_request_or_404(self, request_id: uuid.UUID) -> PlanChangeRequest:
        stmt = select(PlanChangeRequest).where(PlanChangeRequest.id == request_id)
        request = (await self.session.execute(stmt)).scalar_one_or_none()
        if request is None:
            raise PlanChangeRequestNotFoundError()
        return request

    @staticmethod
    def _to_superadmin_read(request: PlanChangeRequest) -> SuperadminPlanChangeRequestRead:
        business = request.business
        return SuperadminPlanChangeRequestRead(
            id=request.id,
            business_id=request.business_id,
            requested_by_user_id=request.requested_by_user_id,
            current_plan=request.current_plan,
            requested_plan=request.requested_plan,
            direction=request.direction,
            status=request.status,
            note=request.note,
            created_at=request.created_at,
            updated_at=request.updated_at,
            resolved_at=request.resolved_at,
            resolved_by_user_id=request.resolved_by_user_id,
            business_name=business.name if business is not None else "",
            business_slug=business.slug if business is not None else "",
        )
