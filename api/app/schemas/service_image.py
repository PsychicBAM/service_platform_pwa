"""Schemas for per-service uploaded image metadata."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ServiceImageMedia(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Literal["image"] = "image"
    url: str
    thumbnail_url: str = ""
    alt: str = ""
    filename: str = ""
    content_type: str = ""
    size: int = 0
    original_size: int = 0
    width: int = 0
    height: int = 0


class ServiceImageUploadResponse(BaseModel):
    service_id: str
    image: ServiceImageMedia


class ServiceImageRemoveResponse(BaseModel):
    service_id: str
    removed: bool = True
