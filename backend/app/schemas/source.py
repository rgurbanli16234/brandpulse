"""Source schemas."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict

SourceType = Literal["csv", "manual", "reddit", "rss", "demo"]


class SourceIn(BaseModel):
    type: SourceType
    config_json: dict | None = None
    enabled: bool = True


class SourceUpdate(BaseModel):
    config_json: dict | None = None
    enabled: bool | None = None


class SourceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: str
    config_json: dict | None = None
    enabled: bool
