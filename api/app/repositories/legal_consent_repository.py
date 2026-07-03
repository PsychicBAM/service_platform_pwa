import uuid
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.business import Business
from app.models.enums import ConsentEntityType, ConsentSource
from app.models.legal_consent_record import LegalConsentRecord
from app.schemas.legal_consent import LEGAL_CONSENT_VERSION


@dataclass(frozen=True)
class LegalConsentRecordRow:
    record: LegalConsentRecord
    business_name: str | None


class LegalConsentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_consent_records(
        self,
        *,
        source: ConsentSource | None = None,
        entity_type: ConsentEntityType | None = None,
        business_id: uuid.UUID | None = None,
        page: int = 1,
        limit: int = 25,
    ) -> list[LegalConsentRecordRow]:
        stmt = self._list_select()
        stmt = self._apply_filters(
            stmt,
            source=source,
            entity_type=entity_type,
            business_id=business_id,
        )
        stmt = stmt.order_by(
            LegalConsentRecord.accepted_at.desc(),
            LegalConsentRecord.created_at.desc(),
            LegalConsentRecord.id.desc(),
        )
        offset = max(page - 1, 0) * limit
        stmt = stmt.offset(offset).limit(limit)
        result = await self.session.execute(stmt)
        return [
            LegalConsentRecordRow(record=record, business_name=business_name)
            for record, business_name in result.all()
        ]

    async def count_consent_records(
        self,
        *,
        source: ConsentSource | None = None,
        entity_type: ConsentEntityType | None = None,
        business_id: uuid.UUID | None = None,
    ) -> int:
        stmt = select(func.count()).select_from(LegalConsentRecord)
        stmt = self._apply_filters(
            stmt,
            source=source,
            entity_type=entity_type,
            business_id=business_id,
        )
        result = await self.session.execute(stmt)
        return int(result.scalar_one())

    def _list_select(self):
        return select(LegalConsentRecord, Business.name).outerjoin(
            Business,
            LegalConsentRecord.business_id == Business.id,
        )

    def _apply_filters(
        self,
        stmt,
        *,
        source: ConsentSource | None,
        entity_type: ConsentEntityType | None,
        business_id: uuid.UUID | None,
    ):
        if source is not None:
            stmt = stmt.where(LegalConsentRecord.source == source.value)
        if entity_type is not None:
            stmt = stmt.where(LegalConsentRecord.entity_type == entity_type.value)
        if business_id is not None:
            stmt = stmt.where(LegalConsentRecord.business_id == business_id)
        return stmt

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
