"""Tests for service configuration fields on business settings."""

from __future__ import annotations

import pytest

from app.schemas.business import BusinessSettingsRead, BusinessSettingsUpdate


def test_settings_read_includes_rub_and_decimal_tax() -> None:
    settings = BusinessSettingsRead.from_settings(
        {
            "service_currency": "rub",
            "tax_mode": "exclusive",
            "tax_rate_percent": 7.5,
            "show_tax_note_to_customers": True,
        }
    )
    assert settings.service_currency == "RUB"
    assert settings.tax_mode == "exclusive"
    assert settings.tax_rate_percent == 7.5
    assert settings.show_tax_note_to_customers is True


def test_settings_read_maps_legacy_price_display_hide_tax() -> None:
    settings = BusinessSettingsRead.from_settings({"price_display": "hide_tax"})
    assert settings.show_tax_note_to_customers is False


def test_settings_update_accepts_custom_tax_percent() -> None:
    payload = BusinessSettingsUpdate(tax_mode="inclusive", tax_rate_percent=12.25)
    assert payload.tax_mode == "inclusive"
    assert payload.tax_rate_percent == 12.25


def test_settings_update_rejects_tax_percent_over_100() -> None:
    with pytest.raises(ValueError, match="tax_rate_percent"):
        BusinessSettingsUpdate(tax_rate_percent=150)


def test_settings_update_accepts_rub_currency() -> None:
    payload = BusinessSettingsUpdate(service_currency="rub")
    assert payload.service_currency == "RUB"


def test_settings_update_accepts_show_tax_note_flag() -> None:
    payload = BusinessSettingsUpdate(show_tax_note_to_customers=False)
    assert payload.show_tax_note_to_customers is False
