import uuid
from datetime import date, datetime, time
from typing import Annotated, Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

TimeStr = Annotated[str, Field(pattern=r"^\d{2}:\d{2}$")]


def parse_time_hhmm(value: str) -> time:
    hour, minute = value.split(":")
    return time(int(hour), int(minute))


def validate_day_of_week(value: int | None) -> int | None:
    if value is not None and not (0 <= value <= 6):
        raise ValueError("day_of_week must be between 0 and 6")
    return value


class WorkingHourRead(BaseModel):
    id: uuid.UUID
    business_id: uuid.UUID
    day_of_week: int
    is_open: bool
    opens_at: time | None
    closes_at: time | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkingHourUpdate(BaseModel):
    day_of_week: int
    is_open: bool = True
    opens_at: TimeStr | None = None
    closes_at: TimeStr | None = None

    @field_validator("day_of_week")
    @classmethod
    def day_range(cls, value: int) -> int:
        return validate_day_of_week(value)  # type: ignore[return-value]

    @model_validator(mode="after")
    def validate_open_hours(self) -> "WorkingHourUpdate":
        if self.is_open:
            if self.opens_at is None or self.closes_at is None:
                raise ValueError("opens_at and closes_at are required when is_open is true")
            opens = parse_time_hhmm(self.opens_at)
            closes = parse_time_hhmm(self.closes_at)
            if opens >= closes:
                raise ValueError("opens_at must be before closes_at")
        return self


class WorkingHoursReplaceRequest(BaseModel):
    working_hours: list[WorkingHourUpdate]


class WorkingBreakRead(BaseModel):
    id: uuid.UUID
    business_id: uuid.UUID
    label: str | None
    day_of_week: int | None
    starts_at: time
    ends_at: time
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkingBreakCreate(BaseModel):
    label: str | None = None
    day_of_week: int | None = None
    starts_at: TimeStr
    ends_at: TimeStr

    @field_validator("day_of_week")
    @classmethod
    def day_range(cls, value: int | None) -> int | None:
        return validate_day_of_week(value)

    @model_validator(mode="after")
    def validate_times(self) -> "WorkingBreakCreate":
        if parse_time_hhmm(self.starts_at) >= parse_time_hhmm(self.ends_at):
            raise ValueError("starts_at must be before ends_at")
        return self


class WorkingBreakUpdate(BaseModel):
    label: str | None = None
    day_of_week: int | None = None
    starts_at: TimeStr | None = None
    ends_at: TimeStr | None = None

    @field_validator("day_of_week")
    @classmethod
    def day_range(cls, value: int | None) -> int | None:
        return validate_day_of_week(value)

    @model_validator(mode="after")
    def validate_times(self) -> "WorkingBreakUpdate":
        if self.starts_at is not None and self.ends_at is not None:
            if parse_time_hhmm(self.starts_at) >= parse_time_hhmm(self.ends_at):
                raise ValueError("starts_at must be before ends_at")
        return self


class UnavailableTimeRead(BaseModel):
    id: uuid.UUID
    business_id: uuid.UUID
    starts_at: datetime
    ends_at: datetime
    reason: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UnavailableTimeCreate(BaseModel):
    starts_at: datetime
    ends_at: datetime
    reason: str | None = None

    @model_validator(mode="after")
    def validate_range(self) -> "UnavailableTimeCreate":
        if self.starts_at >= self.ends_at:
            raise ValueError("starts_at must be before ends_at")
        if self.starts_at.tzinfo is None or self.ends_at.tzinfo is None:
            raise ValueError("starts_at and ends_at must be timezone-aware")
        return self


class UnavailableTimeUpdate(BaseModel):
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    reason: str | None = None

    @model_validator(mode="after")
    def validate_range(self) -> "UnavailableTimeUpdate":
        if self.starts_at is not None and self.starts_at.tzinfo is None:
            raise ValueError("starts_at must be timezone-aware")
        if self.ends_at is not None and self.ends_at.tzinfo is None:
            raise ValueError("ends_at must be timezone-aware")
        if self.starts_at is not None and self.ends_at is not None:
            if self.starts_at >= self.ends_at:
                raise ValueError("starts_at must be before ends_at")
        return self


class ScheduleSettingsRead(BaseModel):
    slot_interval_minutes: int = 30
    booking_buffer_minutes: int = 0


class ScheduleRead(BaseModel):
    working_hours: list[WorkingHourRead]
    breaks: list[WorkingBreakRead]
    unavailable_times: list[UnavailableTimeRead]
    settings: ScheduleSettingsRead


class AvailabilitySlot(BaseModel):
    starts_at: datetime
    ends_at: datetime
    spots_remaining: int | None = None


class AvailabilityResponse(BaseModel):
    date: date
    timezone: str
    slots: list[AvailabilitySlot]
