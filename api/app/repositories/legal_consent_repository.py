import uuid
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import ConsentEntityType, ConsentSource
from app.models.legal_consent_record import LegalConsentRecord
from app.schemas.legal_consent import LEGAL_CONSENT_VERSION


class LegalConsentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        *,
        source: ConsentSource,
        entity_type: ConsentEntityType,
        entity_id: uuid.UUID | None,
        business_id: uuid.UUID | None,
        user_id: uuid.UUID | None = None,
        client_id: uuid.UUID | None = None,
        legal_consent_version: str = LEGAL_CONSENT_VERSION,
        accepted_at: datetime,
    ) -> LegalConsentRecord:
        record = LegalConsentRecord(
            source=source.value,
            entity_type=entity_type.value,
            entity_id=entity_id,
            business_id=business_id,
            user_id=user_id,
            client_id=client_id,
            legal_consent_version=legal_consent_version,
            accepted_at=accepted_at,
        )
        self.session.add(record)
        await self.session.flush()
        return record
