import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import ConsentEntityType, ConsentSource
from app.schemas.superadmin import SuperadminListMeta


class LegalConsentRecordSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: uuid.UUID | None
    user_id: uuid.UUID | None
    client_id: uuid.UUID | None
    source: ConsentSource
    entity_type: ConsentEntityType
    entity_id: uuid.UUID | None
    legal_consent_version: str
    accepted_at: datetime
    created_at: datetime
    business_name: str | None = None


class LegalConsentRecordListResponse(BaseModel):
    data: list[LegalConsentRecordSummary]
    meta: SuperadminListMeta
