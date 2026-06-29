import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.business import Business
from app.models.enums import BusinessStatus, OperatingMode, SubscriptionPlan, SubscriptionStatus
from app.models.subscription import Subscription
from app.models.user import User
from app.repositories.audit_log_repository import AuditLogRepository
from app.schemas.superadmin import SuperadminBusinessUpdate
from app.services.superadmin_service import SuperadminService


@pytest.mark.asyncio
async def test_update_status_writes_audit_log(db_session: AsyncSession) -> None:
    actor = User(
        id=uuid.uuid4(),
        email=f"super-{uuid.uuid4().hex[:8]}@example.com",
        password_hash="hash",
    )
    business = Business(
        id=uuid.uuid4(),
        name="Audit Biz",
        slug=f"audit-biz-{uuid.uuid4().hex[:8]}",
        operating_mode=OperatingMode.both,
        status=BusinessStatus.pending_setup,
    )
    subscription = Subscription(
        business_id=business.id,
        plan=SubscriptionPlan.free,
        status=SubscriptionStatus.active,
    )
    db_session.add_all([actor, business, subscription])
    await db_session.flush()

    service = SuperadminService(db_session)
    result = await service.update_business_admin_fields(
        business.id,
        SuperadminBusinessUpdate(status=BusinessStatus.active),
        actor_user_id=actor.id,
    )
    assert result.status == BusinessStatus.active

    logs = await AuditLogRepository(db_session).list_logs(
        business_id=business.id,
        action="business.status_changed",
    )
    assert len(logs) == 1
    assert logs[0].log_metadata["old_status"] == "pending_setup"
    assert logs[0].log_metadata["new_status"] == "active"


@pytest.mark.asyncio
async def test_update_plan_writes_audit_log(db_session: AsyncSession) -> None:
    actor = User(
        id=uuid.uuid4(),
        email=f"super-{uuid.uuid4().hex[:8]}@example.com",
        password_hash="hash",
    )
    business = Business(
        id=uuid.uuid4(),
        name="Plan Biz",
        slug=f"plan-biz-{uuid.uuid4().hex[:8]}",
        operating_mode=OperatingMode.both,
        status=BusinessStatus.active,
    )
    subscription = Subscription(
        business_id=business.id,
        plan=SubscriptionPlan.free,
        status=SubscriptionStatus.active,
    )
    db_session.add_all([actor, business, subscription])
    await db_session.flush()

    service = SuperadminService(db_session)
    result = await service.update_business_admin_fields(
        business.id,
        SuperadminBusinessUpdate(plan=SubscriptionPlan.starter),
        actor_user_id=actor.id,
    )
    assert result.subscription is not None
    assert result.subscription.plan == SubscriptionPlan.starter

    logs = await AuditLogRepository(db_session).list_logs(
        business_id=business.id,
        action="subscription.plan_changed",
    )
    assert len(logs) == 1
    assert logs[0].log_metadata["old_plan"] == "free"
    assert logs[0].log_metadata["new_plan"] == "starter"


@pytest.mark.asyncio
async def test_no_audit_log_when_plan_unchanged(db_session: AsyncSession) -> None:
    actor = User(
        id=uuid.uuid4(),
        email=f"super-{uuid.uuid4().hex[:8]}@example.com",
        password_hash="hash",
    )
    business = Business(
        id=uuid.uuid4(),
        name="Plan Noop Biz",
        slug=f"plan-noop-{uuid.uuid4().hex[:8]}",
        operating_mode=OperatingMode.both,
        status=BusinessStatus.active,
        settings={
            "selected_plan_intent": "business",
            "selected_plan_intent_source": "registration",
        },
    )
    subscription = Subscription(
        business_id=business.id,
        plan=SubscriptionPlan.free,
        status=SubscriptionStatus.active,
    )
    db_session.add_all([actor, business, subscription])
    await db_session.flush()

    service = SuperadminService(db_session)
    result = await service.update_business_admin_fields(
        business.id,
        SuperadminBusinessUpdate(plan=SubscriptionPlan.free),
        actor_user_id=actor.id,
    )
    assert result.subscription is not None
    assert result.subscription.plan == SubscriptionPlan.free
    assert result.selected_plan_intent == SubscriptionPlan.business

    logs = await AuditLogRepository(db_session).list_logs(
        business_id=business.id,
        action="subscription.plan_changed",
    )
    assert len(logs) == 0


@pytest.mark.asyncio
async def test_plan_change_audit_includes_selected_plan_intent(db_session: AsyncSession) -> None:
    actor = User(
        id=uuid.uuid4(),
        email=f"super-{uuid.uuid4().hex[:8]}@example.com",
        password_hash="hash",
    )
    business = Business(
        id=uuid.uuid4(),
        name="Intent Audit Biz",
        slug=f"intent-audit-{uuid.uuid4().hex[:8]}",
        operating_mode=OperatingMode.both,
        status=BusinessStatus.active,
        settings={
            "selected_plan_intent": "business",
            "selected_plan_intent_source": "registration",
        },
    )
    subscription = Subscription(
        business_id=business.id,
        plan=SubscriptionPlan.free,
        status=SubscriptionStatus.active,
    )
    db_session.add_all([actor, business, subscription])
    await db_session.flush()

    service = SuperadminService(db_session)
    await service.update_business_admin_fields(
        business.id,
        SuperadminBusinessUpdate(plan=SubscriptionPlan.business),
        actor_user_id=actor.id,
    )

    logs = await AuditLogRepository(db_session).list_logs(
        business_id=business.id,
        action="subscription.plan_changed",
    )
    assert len(logs) == 1
    assert logs[0].log_metadata["old_plan"] == "free"
    assert logs[0].log_metadata["new_plan"] == "business"
    assert logs[0].log_metadata["selected_plan_intent"] == "business"
    assert logs[0].log_metadata["selected_plan_intent_source"] == "registration"
    assert logs[0].log_metadata["change_source"] == "superadmin_manual"


@pytest.mark.asyncio
async def test_no_audit_log_when_status_unchanged(db_session: AsyncSession) -> None:
    actor = User(
        id=uuid.uuid4(),
        email=f"super-{uuid.uuid4().hex[:8]}@example.com",
        password_hash="hash",
    )
    business = Business(
        id=uuid.uuid4(),
        name="Noop Biz",
        slug=f"noop-biz-{uuid.uuid4().hex[:8]}",
        operating_mode=OperatingMode.both,
        status=BusinessStatus.active,
    )
    subscription = Subscription(
        business_id=business.id,
        plan=SubscriptionPlan.free,
        status=SubscriptionStatus.active,
    )
    db_session.add_all([actor, business, subscription])
    await db_session.flush()

    service = SuperadminService(db_session)
    await service.update_business_admin_fields(
        business.id,
        SuperadminBusinessUpdate(status=BusinessStatus.active),
        actor_user_id=actor.id,
    )

    count = await AuditLogRepository(db_session).count_logs(business_id=business.id)
    assert count == 0
