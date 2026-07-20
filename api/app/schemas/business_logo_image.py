"""Schemas for business logo image upload responses."""

from __future__ import annotations

from pydantic import BaseModel


class BusinessLogoImageUploadResponse(BaseModel):
    logo_url: str


class BusinessLogoImageRemoveResponse(BaseModel):
    removed: bool = True
