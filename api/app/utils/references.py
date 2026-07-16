"""Reference generators for domain entities."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Literal

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking
from app.models.order import Order
from app.models.public_reference_counter import PublicReferenceCounter

PublicReferenceKind = Literal["booking", "request"]

_PREFIX_BY_KIND: dict[PublicReferenceKind, str] = {
    "booking": "BKG",
    "request": "REQ",
}

_MAX_COLLISION_RETRIES = 25


def format_public_reference(kind: PublicReferenceKind, year: int, number: int) -> str:
    prefix = _PREFIX_BY_KIND[kind]
    return f"{prefix}-{year % 100:02d}-{number:04d}"


async def _reference_exists(
    session: AsyncSession,
    kind: PublicReferenceKind,
    reference: str,
) -> bool:
    model = Booking if kind == "booking" else Order
    result = await session.execute(
        select(model.id).where(model.reference == reference).limit(1)
    )
    return result.scalar_one_or_none() is not None


async def _allocate_next_number(
    session: AsyncSession,
    kind: PublicReferenceKind,
    year: int,
) -> int:
    """Increment the global counter for (kind, year) under row lock."""
    stmt = (
        select(PublicReferenceCounter)
        .where(
            PublicReferenceCounter.kind == kind,
            PublicReferenceCounter.year == year,
        )
        .with_for_update()
    )
    row = (await session.execute(stmt)).scalar_one_or_none()
    if row is None:
        async with session.begin_nested():
            session.add(
                PublicReferenceCounter(
                    kind=kind,
                    year=year,
                    last_number=0,
                )
            )
            try:
                await session.flush()
            except IntegrityError:
                pass
        row = (await session.execute(stmt)).scalar_one()

    row.last_number += 1
    await session.flush()
    return row.last_number


async def next_public_reference(
    session: AsyncSession,
    kind: PublicReferenceKind,
    *,
    year: int | None = None,
) -> str:
    """Allocate the next global short public reference for booking or request.

    Format: BKG-26-0001 / REQ-26-0001 (YY = last two digits of year).
    Sequences are separate per kind and reset each calendar year.
    """
    if kind not in _PREFIX_BY_KIND:
        raise ValueError(f"Unsupported public reference kind: {kind}")
    resolved_year = year if year is not None else datetime.now(UTC).year

    for _ in range(_MAX_COLLISION_RETRIES):
        number = await _allocate_next_number(session, kind, resolved_year)
        reference = format_public_reference(kind, resolved_year, number)
        if not await _reference_exists(session, kind, reference):
            return reference

    raise RuntimeError(
        f"Unable to allocate unique public {kind} reference for year {resolved_year}."
    )


async def generate_booking_reference(
    session: AsyncSession,
    business_id: uuid.UUID,
    year: int,
) -> str:
    """Allocate next global booking reference (business_id kept for call-site compat)."""
    _ = business_id
    return await next_public_reference(session, "booking", year=year)


async def generate_order_reference(
    session: AsyncSession,
    business_id: uuid.UUID,
    year: int,
) -> str:
    """Allocate next global request reference (ORD prefix retired for new records)."""
    _ = business_id
    return await next_public_reference(session, "request", year=year)
