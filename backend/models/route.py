from pydantic import BaseModel, Field, field_validator
from typing import List


class RouteRequest(BaseModel):
    task:  str       = Field(..., min_length=3, max_length=2000)
    steps: List[str] = Field(..., min_length=1, description="Steps from /plan")

    @field_validator("task")
    @classmethod
    def strip_task(cls, v: str) -> str:
        return v.strip()


class ToolSuggestion(BaseModel):
    tool:       str        = Field(..., description="AI tool name")
    reason:     str        = Field(..., description="Why this tool fits the task")
    confidence: float      = Field(..., ge=0.0, le=1.0, description="Match confidence 0–1")
    strengths:  List[str]  = Field(..., description="Key strengths of this tool")


class RouteResponse(BaseModel):
    primary_tool: ToolSuggestion        = Field(..., description="Top recommended tool")
    alternatives: List[ToolSuggestion]  = Field(..., description="Other viable tools")
