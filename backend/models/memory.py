"""
Memory system models — Pydantic schemas for all memory API endpoints.
"""
from __future__ import annotations
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import List, Optional
from enum import Enum


# ── Enums ──────────────────────────────────────────────────────────────────
class FeedbackRating(int, Enum):
    terrible  = 1
    poor      = 2
    okay      = 3
    good      = 4
    excellent = 5


class SortBy(str, Enum):
    newest    = "newest"
    oldest    = "oldest"
    rating    = "rating"
    reused    = "reused"


# ── Save / update ──────────────────────────────────────────────────────────
class SaveRequest(BaseModel):
    task:          str       = Field(..., min_length=3, max_length=2000)
    task_type:     str       = Field("general", description="Detected task category")
    steps:         List[str] = Field(..., min_length=1)
    tool:          str       = Field(..., description="AI model used")
    system_prompt: str       = Field(..., min_length=1)
    user_prompt:   str       = Field(..., min_length=1)
    tags:          List[str] = Field(default_factory=list)

    @field_validator("task")
    @classmethod
    def strip_task(cls, v: str) -> str:
        return v.strip()

    @field_validator("tags")
    @classmethod
    def clean_tags(cls, v: List[str]) -> List[str]:
        return [t.lower().strip() for t in v if t.strip()]


class FeedbackRequest(BaseModel):
    rating:  FeedbackRating = Field(..., description="1 (terrible) – 5 (excellent)")
    comment: Optional[str]  = Field(None, max_length=1000, description="Optional free-text feedback")
    reused:  bool           = Field(False, description="Was this prompt reused in another session?")

    @field_validator("comment")
    @classmethod
    def strip_comment(cls, v: Optional[str]) -> Optional[str]:
        return v.strip() if v else None


# ── Response shapes ────────────────────────────────────────────────────────
class MemoryEntry(BaseModel):
    id:            str            = Field(..., description="UUID")
    task:          str
    task_type:     str
    steps:         List[str]
    tool:          str
    system_prompt: str
    user_prompt:   str
    tags:          List[str]
    rating:        Optional[int]  = Field(None, description="1–5 user rating")
    feedback:      Optional[str]  = Field(None, description="User feedback comment")
    reuse_count:   int            = Field(0,    description="Times prompt was reused")
    score:         float          = Field(0.0,  description="Computed quality score")
    created_at:    str
    updated_at:    str


class MemoryListResponse(BaseModel):
    total:   int               = Field(..., description="Total matching entries")
    entries: List[MemoryEntry] = Field(..., description="Paginated entries")


class BestPromptsResponse(BaseModel):
    total:   int               = Field(..., description="Total qualifying entries")
    entries: List[MemoryEntry] = Field(..., description="Top-ranked prompts")


class StatsResponse(BaseModel):
    total_tasks:    int            = Field(..., description="Total tasks stored")
    avg_rating:     Optional[float]= Field(None, description="Average rating across rated tasks")
    top_tool:       Optional[str]  = Field(None, description="Most-used AI tool")
    top_task_type:  Optional[str]  = Field(None, description="Most common task type")
    total_reuses:   int            = Field(..., description="Total prompt reuse count")
    rated_count:    int            = Field(..., description="Number of rated entries")
    tool_breakdown: dict           = Field(..., description="Count per AI tool")


class DeleteResponse(BaseModel):
    success: bool
    id:      str


class ClearResponse(BaseModel):
    success: bool
    deleted: int
    message: str
