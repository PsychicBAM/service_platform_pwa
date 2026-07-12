from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.service_slot_capacity_override import ServiceSlotCapacityOverride


class ServiceSlotCapacityOverrideCreate(BaseModel):
    starts_at: datetime
    capacity: int = Field(ge=1)
    note: str | None = Field(default=None, max_length=255)


class ServiceSlotCapacityOverrideRead(BaseModel):
    id: uuid.UUID
    business_id: uuid.UUID
    service_id: uuid.UUID
    starts_at: datetime
    capacity: int
    note: str | None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_override(cls, override: ServiceSlotCapacityOverride) -> ServiceSlotCapacityOverrideRead:
        return cls(
            id=override.id,
            business_id=override.business_id,
            service_id=override.service_id,
            starts_at=override.starts_at,
            capacity=override.capacity,
            note=override.note,
            created_at=override.created_at,
            updated_at=override.updated_at,
        )


class ServiceSlotCapacityOverrideListResponse(BaseModel):
    data: list[ServiceSlotCapacityOverrideRead]
