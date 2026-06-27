import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.business import InvalidTimezoneError
from app.models.business import Business
from app.models.enums import BusinessStatus, OperatingMode
from app.repositories.business_repository import DEFAULT_BUSINESS_SETTINGS, BusinessRepository
from app.schemas.business import BusinessSettingsRead, BusinessSettingsUpdate, BusinessUpdate
from app.services.business_service import BusinessService


def test_business_settings_read_uses_defaults_for_missing_keys() -> None:
    settings = BusinessSettingsRead.from_settings({"cancellation_hours": 12})
    assert settings.cancellation_hours == 12
    assert settings.slot_interval_minutes == DEFAULT_BUSINESS_SETTINGS["slot_interval_minutes"]


def test_business_settings_update_rejects_invalid_cancellation_hours() -> None:
    with pytest.raises(ValueError, match="cancellation_hours"):
        BusinessSettingsUpdate(cancellation_hours=9999)


def test_business_settings_update_rejects_invalid_slot_interval() -> None:
    with pytest.raises(ValueError, match="slot_interval_minutes"):
        BusinessSettingsUpdate(slot_interval_minutes=7)


def test_business_service_validate_timezone_accepts_valid() -> None:
    BusinessService._validate_timezone("America/New_York")


def test_business_service_validate_timezone_rejects_invalid() -> None:
    with pytest.raises(InvalidTimezoneError):
        BusinessService._validate_timezone("Not/A_Real_Zone")


@pytest.mark.asyncio
async def test_update_settings_merges_unknown_keys(db_session: AsyncSession) -> None:
    business = Business(
        id=uuid.uuid4(),
        name="Merge Test",
        slug=f"merge-test-{uuid.uuid4().hex[:8]}",
        operating_mode=OperatingMode.both,
        status=BusinessStatus.active,
        settings={"custom_future_key": True, **DEFAULT_BUSINESS_SETTINGS},
    )
    db_session.add(business)
    await db_session.flush()

    repo = BusinessRepository(db_session)
    await repo.update_settings(business, {"cancellation_hours": 72})

    assert business.settings["custom_future_key"] is True
    assert business.settings["cancellation_hours"] == 72


@pytest.mark.asyncio
async def test_update_admin_business_applies_profile_and_settings(
    db_session: AsyncSession,
) -> None:
    business = Business(
        id=uuid.uuid4(),
        name="Service Test",
        slug=f"service-test-{uuid.uuid4().hex[:8]}",
        operating_mode=OperatingMode.both,
        status=BusinessStatus.active,
        timezone="UTC",
        settings=dict(DEFAULT_BUSINESS_SETTINGS),
    )
    db_session.add(business)
    await db_session.flush()

    service = BusinessService(db_session)
    result = await service.update_admin_business(
        business,
        BusinessUpdate(
            name="Renamed Biz",
            timezone="Europe/London",
            settings=BusinessSettingsUpdate(cancellation_hours=36),
        ),
    )

    assert result.name == "Renamed Biz"
    assert result.timezone == "Europe/London"
    assert result.settings.cancellation_hours == 36
