"""Keyword schemas."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

KeywordType = Literal["brand", "product", "executive", "typo", "competitor"]


class KeywordIn(BaseModel):
    term: str = Field(min_length=1, max_length=200)
    type: KeywordType = "brand"


class KeywordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    term: str
    type: str
