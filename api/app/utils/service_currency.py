"""Resolve the business-level display currency for services."""

from __future__ import annotations

from typing import Any


def resolve_service_currency(settings: dict[str, Any] | None) -> str:
    raw = (settings or {}).get("service_currency") or "USD"
    return str(raw).strip().upper() or "USD"
