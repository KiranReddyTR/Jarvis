"""
Feedback models — quick thumbs up/down with optional comment.
"""
from __future__ import annotations
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from enum import Enum


class VoteType(str, Enum):
    up   = "up"
    down = "down"


class QuickFeedbackRequest(BaseModel):
    """Thumbs up / down on a generated prompt."""
    entry_id:  str           = Field(..., description="Memory entry UUID")
    vote:      VoteType      = Field(..., description="'up' or 'down'")
    comment:   Optional[str] = Field(None, max_length=500, description="Optional comment")

    @field_validator("comment")
    @classmethod
    def strip_comment(cls, v: Optional[str]) -> Optional[str]:
        return v.strip() if v else None


class ImprovementDetail(BaseModel):
    field:  str = Field(..., description="Which prompt field was changed")
    reason: str = Field(..., description="Why this change was made")
    change: str = Field(..., description="Summary of what changed")


class FeedbackResponse(BaseModel):
    entry_id:      str                    = Field(..., description="Memory entry UUID")
    vote:          str                    = Field(..., description="'up' or 'down'")
    improved:      bool                   = Field(..., description="Whether the prompt was improved")
    improvements:  List[ImprovementDetail]= Field(..., description="List of changes made")
    system_prompt: str                    = Field(..., description="Improved system prompt")
    user_prompt:   str                    = Field(..., description="Improved user prompt")
    message:       str                    = Field(..., description="Human-readable summary")
