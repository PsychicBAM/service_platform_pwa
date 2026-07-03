from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import ConsentEntityType, ConsentSource
from app.models.legal_consent_record import LegalConsentRecord
from app.repositories.legal_consent_repository import LegalConsentRepository
from app.schemas.legal_consent import LEGAL_CONSENT_VERSION


class LegalConsentService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = LegalConsentRepository(session)

    async def record_registration_consent(
        self,
        *,
        user_id: uuid.UUID,
        business_id: uuid.UUID,
        accepted_at: datetime | None = None,
    ) -> LegalConsentRecord:
        return await self.repo.create(
            source=ConsentSource.registration,
            entity_type=ConsentEntityType.business,
            entity_id=business_id,
            business_id=business_id,
            user_id=user_id,
            accepted_at=accepted_at or datetime.now(UTC),
            legal_consent_version=LEGAL_CONSENT_VERSION,
        )

    async def record_public_booking_consent(
        self,
        *,
        booking_id: uuid.UUID,
        business_id: uuid.UUID,
        client_id: uuid.UUID | None,
        accepted_at: datetime | None = None,
    ) -> LegalConsentRecord:
        return await self.repo.create(
            source=ConsentSource.public_booking,
            entity_type=ConsentEntityType.booking,
            entity_id=booking_id,
            business_id=business_id,
            client_id=client_id,
            accepted_at=accepted_at or datetime.now(UTC),
            legal_consent_version=LEGAL_CONSENT_VERSION,
        )

    async def record_public_order_consent(
        self,
        *,
        order_id: uuid.UUID,
        business_id: uuid.UUID,
        client_id: uuid.UUID | None,
        accepted_at: datetime | None = None,
    ) -> LegalConsentRecord:
        return await self.repo.create(
            source=ConsentSource.public_order,
            entity_type=ConsentEntityType.order,
            entity_id=order_id,
            business_id=business_id,
            client_id=client_id,
            accepted_at=accepted_at or datetime.now(UTC),
            legal_consent_version=LEGAL_CONSENT_VERSION,
        )
