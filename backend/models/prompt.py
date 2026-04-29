from __future__ import annotations
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from enum import Enum

SUPPORTED_TOOLS = {"ChatGPT", "Claude", "Gemini"}


# ── Enums ──────────────────────────────────────────────────────────────────
class OutputFormat(str, Enum):
    markdown   = "markdown"
    json       = "json"
    plain      = "plain"
    numbered   = "numbered"
    bullets    = "bullets"
    code       = "code"


class ToneStyle(str, Enum):
    professional = "professional"
    concise      = "concise"
    detailed     = "detailed"
    creative     = "creative"
    technical    = "technical"


# ── Request ────────────────────────────────────────────────────────────────
class PromptRequest(BaseModel):
    task:          str                   = Field(..., min_length=3, max_length=2000)
    steps:         List[str]             = Field(..., min_length=1)
    tool:          str                   = Field(..., description="ChatGPT | Claude | Gemini")
    task_type:     Optional[str]         = Field(None, description="Detected task type from /plan")
    output_format: OutputFormat          = Field(OutputFormat.markdown, description="Desired output format")
    tone:          ToneStyle             = Field(ToneStyle.professional, description="Response tone/style")
    context:       Optional[str]         = Field(None, max_length=1000, description="Extra context or constraints")
    save:          bool                  = Field(False, description="Persist this prompt to the store")
    tags:          List[str]             = Field(default_factory=list, description="Tags for saved prompts")

    @field_validator("task")
    @classmethod
    def strip_task(cls, v: str) -> str:
        return v.strip()

    @field_validator("tool")
    @classmethod
    def validate_tool(cls, v: str) -> str:
        if v not in SUPPORTED_TOOLS:
            raise ValueError(f"tool must be one of {sorted(SUPPORTED_TOOLS)}")
        return v


# ── Structured prompt sections ─────────────────────────────────────────────
class PromptSections(BaseModel):
    role:          str = Field(..., description="Who the AI should act as")
    instructions:  str = Field(..., description="What the AI must do, step by step")
    output_format: str = Field(..., description="How the response should be structured")
    constraints:   str = Field(..., description="Rules and boundaries to follow")
    examples:      str = Field(..., description="Few-shot examples or placeholders")


# ── Response ───────────────────────────────────────────────────────────────
class PromptResponse(BaseModel):
    tool:          str            = Field(..., description="Target AI tool")
    system_prompt: str            = Field(..., description="Full system-level instruction")
    user_prompt:   str            = Field(..., description="Full structured user message")
    sections:      PromptSections = Field(..., description="Individual prompt sections")
    tips:          List[str]      = Field(..., description="Usage tips for the selected tool")
    saved_id:      Optional[str]  = Field(None, description="ID if prompt was saved")


# ── Saved prompt store models ──────────────────────────────────────────────
class SavedPrompt(BaseModel):
    id:            str            = Field(..., description="Unique prompt ID")
    task:          str            = Field(..., description="Original task")
    tool:          str            = Field(..., description="Target AI tool")
    task_type:     str            = Field(..., description="Task category")
    output_format: str            = Field(..., description="Output format used")
    tone:          str            = Field(..., description="Tone style used")
    system_prompt: str            = Field(..., description="System prompt")
    user_prompt:   str            = Field(..., description="User prompt")
    sections:      PromptSections = Field(..., description="Structured sections")
    tags:          List[str]      = Field(..., description="User-defined tags")
    created_at:    str            = Field(..., description="ISO 8601 creation timestamp")
    used_count:    int            = Field(0, description="Times this prompt was reused")


class SavedPromptList(BaseModel):
    total:   int               = Field(..., description="Total saved prompts")
    prompts: List[SavedPrompt] = Field(..., description="Saved prompts list")


class TemplateInfo(BaseModel):
    task_type:   str       = Field(..., description="Task category")
    role:        str       = Field(..., description="Default role for this type")
    description: str       = Field(..., description="What this template is for")
    tools:       List[str] = Field(..., description="Best-fit AI tools")
