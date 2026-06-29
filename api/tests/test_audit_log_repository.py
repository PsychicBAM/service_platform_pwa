"""Unit tests for AuditLogRepository helpers."""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.audit_log_repository import AuditLogRepository


@pytest.mark.asyncio
async def test_has_metadata_value_true_when_key_exists(db_session: AsyncSession) -> None:
    repo = AuditLogRepository(db_session)
    await repo.create(
        actor_user_id=None,
        business_id=None,
        action="subscription.plan_changed",
        metadata={"stripe_event_id": "evt_123"},
    )
    await db_session.commit()

    assert await repo.has_metadata_value(
        metadata_key="stripe_event_id",
        metadata_value="evt_123",
    )


@pytest.mark.asyncio
async def test_has_metadata_value_false_when_key_missing(db_session: AsyncSession) -> None:
    repo = AuditLogRepository(db_session)
    await repo.create(
        actor_user_id=None,
        business_id=None,
        action="subscription.plan_changed",
        metadata={"stripe_event_id": "evt_123"},
    )
    await db_session.commit()

    assert not await repo.has_metadata_value(
        metadata_key="stripe_event_id",
        metadata_value="missing",
    )


@pytest.mark.asyncio
async def test_has_metadata_value_false_when_no_matching_logs(
    db_session: AsyncSession,
) -> None:
    repo = AuditLogRepository(db_session)
    assert not await repo.has_metadata_value(
        metadata_key="stripe_event_id",
        metadata_value="evt_none",
    )
