"""Schemas for marketplace cover image upload responses."""

from __future__ import annotations

from pydantic import BaseModel

from app.schemas.service_image import ServiceImageMedia


class MarketplaceCoverImageUploadResponse(BaseModel):
    image: ServiceImageMedia


class MarketplaceCoverImageRemoveResponse(BaseModel):
    removed: bool = True
