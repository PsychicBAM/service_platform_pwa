"""Schemas for mini-site uploaded media metadata."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.mini_site import MiniSiteTemplate


class MiniSiteImageMedia(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Literal["image"] = "image"
    url: str
    alt: str = ""
    filename: str = ""
    content_type: str = ""
    size: int = 0


class MiniSiteMediaUploadResponse(BaseModel):
    template: MiniSiteTemplate
    slot: str
    media: MiniSiteImageMedia


class MiniSiteMediaRemoveResponse(BaseModel):
    template: MiniSiteTemplate
    slot: str
    removed: bool = True
