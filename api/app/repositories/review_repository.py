from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.review import Review
from app.models.enums import ReviewStatus


class ReviewRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, review: Review) -> Review:
        self.session.add(review)
        await self.session.flush()
        return review

    async def get_by_id_for_business(
        self,
        business_id: uuid.UUID,
        review_id: uuid.UUID,
    ) -> Review | None:
        stmt = (
            select(Review)
            .where(Review.id == review_id, Review.business_id == business_id)
            .options(
                selectinload(Review.service),
                selectinload(Review.booking),
                selectinload(Review.order),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_for_booking(self, booking_id: uuid.UUID) -> Review | None:
        stmt = select(Review).where(Review.booking_id == booking_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_for_booking_reference(
        self,
        business_id: uuid.UUID,
        booking_reference: str,
    ) -> Review | None:
        normalized = booking_reference.strip()
        if not normalized:
            return None
        stmt = select(Review).where(
            Review.business_id == business_id,
            Review.booking_reference == normalized,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_for_order(self, order_id: uuid.UUID) -> Review | None:
        stmt = select(Review).where(Review.order_id == order_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_for_order_reference(
        self,
        business_id: uuid.UUID,
        order_reference: str,
    ) -> Review | None:
        normalized = order_reference.strip()
        if not normalized:
            return None
        stmt = select(Review).where(
            Review.business_id == business_id,
            Review.order_reference == normalized,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_for_business(
        self,
        business_id: uuid.UUID,
        *,
        status: ReviewStatus | None = None,
        limit: int = 50,
    ) -> list[Review]:
        stmt = (
            select(Review)
            .where(Review.business_id == business_id)
            .options(
                selectinload(Review.service),
                selectinload(Review.booking),
                selectinload(Review.order),
            )
            .order_by(Review.created_at.desc())
            .limit(limit)
        )
        if status is not None:
            stmt = stmt.where(Review.status == status)
        result = await self.session.execute(stmt)
        return list(result.scalars().unique().all())

    async def list_recent_published(
        self,
        business_id: uuid.UUID,
        *,
        limit: int = 5,
    ) -> list[Review]:
        stmt = (
            select(Review)
            .where(
                Review.business_id == business_id,
                Review.status == ReviewStatus.published,
            )
            .options(selectinload(Review.service))
            .order_by(Review.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().unique().all())

    async def published_summary(self, business_id: uuid.UUID) -> tuple[float | None, int]:
        stmt = select(
            func.avg(Review.rating),
            func.count(Review.id),
        ).where(
            Review.business_id == business_id,
            Review.status == ReviewStatus.published,
        )
        result = await self.session.execute(stmt)
        avg, count = result.one()
        return (float(avg) if avg is not None else None, int(count or 0))

