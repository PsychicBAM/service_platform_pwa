"""Helpers for public marketplace location stored in Business.settings."""

from __future__ import annotations

from copy import deepcopy
from typing import Any

from pydantic import BaseModel, ConfigDict, field_validator

PUBLIC_LOCATION_KEY = "public_location"


class PublicLocation(BaseModel):
    model_config = ConfigDict(extra="ignore")

    country: str | None = None
    city: str | None = None
    district_or_area: str | None = None
    public_address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    location_note: str | None = None

    @field_validator(
        "country",
        "city",
        "district_or_area",
        "public_address",
        "location_note",
        mode="before",
    )
    @classmethod
    def normalize_optional_text(cls, value: Any) -> str | None:
        if value is None:
            return None
        if not isinstance(value, str):
            return None
        trimmed = value.strip()
        return trimmed or None

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, value: float | None) -> float | None:
        if value is None:
            return None
        if not -90 <= value <= 90:
            raise ValueError("latitude must be between -90 and 90")
        return value

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, value: float | None) -> float | None:
        if value is None:
            return None
        if not -180 <= value <= 180:
            raise ValueError("longitude must be between -180 and 180")
        return value


class PublicLocationWrite(PublicLocation):
    pass


def _clean_text(value: str | None) -> str | None:
    if value is None:
        return None
    trimmed = value.strip()
    return trimmed or None


def read_public_location(settings: dict[str, Any] | None) -> PublicLocation | None:
    if not isinstance(settings, dict):
        return None
    raw = settings.get(PUBLIC_LOCATION_KEY)
    if not isinstance(raw, dict):
        return None
    try:
        location = PublicLocation.model_validate(raw)
    except Exception:
        return None
    if location.model_dump(exclude_none=True):
        return location
    return None


def set_public_location(
    settings: dict[str, Any] | None,
    location: PublicLocation | None,
) -> dict[str, Any]:
    merged = deepcopy(settings) if isinstance(settings, dict) else {}
    if location is None or not location.model_dump(exclude_none=True):
        merged.pop(PUBLIC_LOCATION_KEY, None)
    else:
        merged[PUBLIC_LOCATION_KEY] = location.model_dump(exclude_none=True)
    return merged


def format_public_location_display(
    location: PublicLocation | None,
    legacy_address: str | None = None,
) -> str | None:
    if location is None:
        return _clean_text(legacy_address)

    district = _clean_text(location.district_or_area)
    city = _clean_text(location.city)
    country = _clean_text(location.country)
    public_address = _clean_text(location.public_address)

    if district and city:
        label = f"{district}, {city}"
        if country:
            return f"{label}, {country}"
        return label

    if city and country:
        return f"{city}, {country}"

    if city:
        return city

    if district and country:
        return f"{district}, {country}"

    if public_address:
        return public_address

    if country:
        return country

    return _clean_text(legacy_address)


def public_location_search_values(location: PublicLocation | None) -> list[str]:
    if location is None:
        return []
    values = [
        location.country,
        location.city,
        location.district_or_area,
        location.public_address,
    ]
    return [value for value in (_clean_text(item) for item in values) if value]
