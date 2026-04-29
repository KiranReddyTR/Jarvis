"""
Prompt router
=============
POST /prompt/              — generate a structured prompt (optionally save it)
GET  /prompt/templates     — list available task-type templates
GET  /prompt/saved         — list saved prompts (with filters + pagination)
GET  /prompt/saved/tags    — list all unique tags
GET  /prompt/saved/{id}    — retrieve a single saved prompt
POST /prompt/saved/{id}/use — increment usage count
DELETE /prompt/saved/{id}  — delete a saved prompt
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from models.prompt import (
    PromptRequest, PromptResponse, PromptSections,
    SavedPrompt, SavedPromptList, TemplateInfo,
)
from services.prompt_generator import PromptGeneratorService, ROLES, TIPS
from services.prompt_store import PromptStore

router  = APIRouter()
_engine = PromptGeneratorService()
_store  = PromptStore()

# ── Template metadata ──────────────────────────────────────────────────────
_TEMPLATE_META = {
    "code":     ("Software Engineer",    "Build, debug, or refactor code",          ["ChatGPT", "Claude"]),
    "write":    ("Content Writer",       "Draft articles, emails, or documents",    ["Claude", "ChatGPT"]),
    "analyze":  ("Strategic Analyst",    "Research, compare, or evaluate topics",   ["Claude", "Gemini"]),
    "creative": ("Creative Director",    "Brainstorm ideas or create content",      ["ChatGPT", "Claude"]),
    "data":     ("Data Scientist",       "Analyse data, write queries, or model",   ["Gemini", "ChatGPT"]),
    "explain":  ("Expert Educator",      "Explain concepts or create tutorials",    ["ChatGPT", "Claude"]),
    "general":  ("Capable Assistant",    "General-purpose tasks",                   ["ChatGPT", "Claude", "Gemini"]),
}


# ── POST /prompt/ ──────────────────────────────────────────────────────────
@router.post(
    "/",
    response_model=PromptResponse,
    summary="Generate a structured prompt",
    description=(
        "Converts a task into a fully structured prompt with Role, Instructions, "
        "Output Format, Constraints, and Examples sections. "
        "Set `save=true` to persist the prompt for reuse."
    ),
)
async def generate_prompt(request: PromptRequest) -> PromptResponse:
    try:
        result = _engine.generate(
            task          = request.task,
            steps         = request.steps,
            tool          = request.tool,
            task_type     = request.task_type or "general",
            output_format = request.output_format.value,
            tone          = request.tone.value,
            context       = request.context,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prompt generation failed: {exc}") from exc

    saved_id: Optional[str] = None

    if request.save:
        saved = _store.save(
            task          = request.task,
            tool          = request.tool,
            task_type     = request.task_type or "general",
            output_format = request.output_format.value,
            tone          = request.tone.value,
            system_prompt = result["system_prompt"],
            user_prompt   = result["user_prompt"],
            sections      = result["sections"],
            tags          = request.tags,
        )
        saved_id = saved["id"]

    return PromptResponse(
        tool          = result["tool"],
        system_prompt = result["system_prompt"],
        user_prompt   = result["user_prompt"],
        sections      = PromptSections(**result["sections"]),
        tips          = result["tips"],
        saved_id      = saved_id,
    )


# ── GET /prompt/templates ──────────────────────────────────────────────────
@router.get(
    "/templates",
    response_model=list[TemplateInfo],
    summary="List prompt templates",
    description="Returns all available task-type templates with role and tool recommendations.",
)
async def list_templates() -> list[TemplateInfo]:
    return [
        TemplateInfo(
            task_type   = task_type,
            role        = role,
            description = desc,
            tools       = tools,
        )
        for task_type, (role, desc, tools) in _TEMPLATE_META.items()
    ]


# ── GET /prompt/saved ──────────────────────────────────────────────────────
@router.get(
    "/saved",
    response_model=SavedPromptList,
    summary="List saved prompts",
    description="Returns saved prompts with optional filters. Sorted by most-used first.",
)
async def list_saved(
    tool:      Optional[str] = Query(None, description="Filter by AI tool"),
    task_type: Optional[str] = Query(None, description="Filter by task type"),
    tag:       Optional[str] = Query(None, description="Filter by tag"),
    search:    Optional[str] = Query(None, description="Search task text"),
    limit:     int           = Query(50, ge=1, le=200),
    offset:    int           = Query(0,  ge=0),
) -> SavedPromptList:
    result = _store.get_all(
        tool=tool, task_type=task_type, tag=tag,
        search=search, limit=limit, offset=offset,
    )
    return SavedPromptList(
        total   = result["total"],
        prompts = [SavedPrompt(**p) for p in result["prompts"]],
    )


# ── GET /prompt/saved/tags ─────────────────────────────────────────────────
@router.get(
    "/saved/tags",
    response_model=list[str],
    summary="List all tags",
    description="Returns all unique tags used across saved prompts.",
)
async def list_tags() -> list[str]:
    return _store.get_tags()


# ── GET /prompt/saved/{id} ─────────────────────────────────────────────────
@router.get(
    "/saved/{prompt_id}",
    response_model=SavedPrompt,
    summary="Get a saved prompt by ID",
)
async def get_saved_prompt(prompt_id: str) -> SavedPrompt:
    entry = _store.get_by_id(prompt_id)
    if not entry:
        raise HTTPException(status_code=404, detail=f"Prompt '{prompt_id}' not found")
    return SavedPrompt(**entry)


# ── POST /prompt/saved/{id}/use ────────────────────────────────────────────
@router.post(
    "/saved/{prompt_id}/use",
    response_model=SavedPrompt,
    summary="Mark a saved prompt as used",
    description="Increments the usage counter. Call this when reusing a saved prompt.",
)
async def use_saved_prompt(prompt_id: str) -> SavedPrompt:
    entry = _store.increment_usage(prompt_id)
    if not entry:
        raise HTTPException(status_code=404, detail=f"Prompt '{prompt_id}' not found")
    return SavedPrompt(**entry)


# ── DELETE /prompt/saved/{id} ──────────────────────────────────────────────
@router.delete(
    "/saved/{prompt_id}",
    summary="Delete a saved prompt",
)
async def delete_saved_prompt(prompt_id: str):
    success = _store.delete(prompt_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Prompt '{prompt_id}' not found")
    return {"success": True, "id": prompt_id}
