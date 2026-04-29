"""
Memory router
=============
POST   /memory/                    — save a task + prompt
GET    /memory/                    — list history (filter, sort, paginate)
GET    /memory/stats               — aggregate statistics
GET    /memory/best                — top-ranked prompts by score
GET    /memory/{id}                — get single entry
POST   /memory/{id}/feedback       — submit rating + comment
POST   /memory/{id}/reuse          — mark prompt as reused
DELETE /memory/clear               — wipe all history
DELETE /memory/{id}                — delete one entry
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from models.memory import (
    SaveRequest, FeedbackRequest,
    MemoryEntry, MemoryListResponse, BestPromptsResponse,
    StatsResponse, DeleteResponse, ClearResponse, SortBy,
)
from services.memory_store import MemoryStore

router = APIRouter()
_store = MemoryStore()


# ── POST /memory/ ──────────────────────────────────────────────────────────
@router.post(
    "/",
    response_model=MemoryEntry,
    status_code=201,
    summary="Save a task to memory",
    description="Persists a completed task with its prompt, AI model, and optional tags.",
)
async def save_entry(req: SaveRequest) -> MemoryEntry:
    try:
        entry = _store.save(
            task          = req.task,
            steps         = req.steps,
            tool          = req.tool,
            system_prompt = req.system_prompt,
            user_prompt   = req.user_prompt,
            task_type     = req.task_type,
            tags          = req.tags,
        )
        return MemoryEntry(**entry)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to save: {exc}") from exc


# ── GET /memory/ ───────────────────────────────────────────────────────────
@router.get(
    "/",
    response_model=MemoryListResponse,
    summary="List task history",
    description="Returns stored entries with filtering, sorting, and pagination.",
)
async def get_history(
    search:    Optional[str] = Query(None, description="Search task text"),
    tool:      Optional[str] = Query(None, description="Filter by AI tool"),
    task_type: Optional[str] = Query(None, description="Filter by task type"),
    tag:       Optional[str] = Query(None, description="Filter by tag"),
    sort_by:   SortBy        = Query(SortBy.newest, description="Sort order"),
    limit:     int           = Query(50, ge=1, le=200),
    offset:    int           = Query(0,  ge=0),
) -> MemoryListResponse:
    result = _store.get_all(
        search=search, tool=tool, task_type=task_type,
        tag=tag, sort_by=sort_by.value, limit=limit, offset=offset,
    )
    return MemoryListResponse(
        total   = result["total"],
        entries = [MemoryEntry(**e) for e in result["entries"]],
    )


# ── GET /memory/stats ──────────────────────────────────────────────────────
@router.get(
    "/stats",
    response_model=StatsResponse,
    summary="Memory statistics",
    description="Returns aggregate stats: total tasks, average rating, top tool, reuse counts.",
)
async def get_stats() -> StatsResponse:
    return StatsResponse(**_store.get_stats())


# ── GET /memory/best ───────────────────────────────────────────────────────
@router.get(
    "/best",
    response_model=BestPromptsResponse,
    summary="Best prompts",
    description=(
        "Returns top-ranked prompts by composite score "
        "(rating × 50% + reuse × 30% + recency × 20%). "
        "Only includes rated or reused entries."
    ),
)
async def get_best_prompts(
    tool:       Optional[str] = Query(None, description="Filter by AI tool"),
    task_type:  Optional[str] = Query(None, description="Filter by task type"),
    min_rating: int           = Query(3, ge=1, le=5, description="Minimum rating threshold"),
    limit:      int           = Query(10, ge=1, le=50),
) -> BestPromptsResponse:
    result = _store.get_best_prompts(
        tool=tool, task_type=task_type,
        min_rating=min_rating, limit=limit,
    )
    return BestPromptsResponse(
        total   = result["total"],
        entries = [MemoryEntry(**e) for e in result["entries"]],
    )


# ── GET /memory/{id} ───────────────────────────────────────────────────────
@router.get(
    "/{entry_id}",
    response_model=MemoryEntry,
    summary="Get a single memory entry",
)
async def get_entry(entry_id: str) -> MemoryEntry:
    entry = _store.get_by_id(entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail=f"Entry '{entry_id}' not found")
    return MemoryEntry(**entry)


# ── POST /memory/{id}/feedback ─────────────────────────────────────────────
@router.post(
    "/{entry_id}/feedback",
    response_model=MemoryEntry,
    summary="Submit feedback for a task",
    description="Rate a prompt 1–5 and optionally add a comment. Updates the quality score.",
)
async def add_feedback(entry_id: str, req: FeedbackRequest) -> MemoryEntry:
    entry = _store.add_feedback(
        entry_id = entry_id,
        rating   = req.rating.value,
        comment  = req.comment,
        reused   = req.reused,
    )
    if not entry:
        raise HTTPException(status_code=404, detail=f"Entry '{entry_id}' not found")
    return MemoryEntry(**entry)


# ── POST /memory/{id}/reuse ────────────────────────────────────────────────
@router.post(
    "/{entry_id}/reuse",
    response_model=MemoryEntry,
    summary="Mark a prompt as reused",
    description="Increments the reuse counter and updates the quality score.",
)
async def mark_reused(entry_id: str) -> MemoryEntry:
    entry = _store.increment_reuse(entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail=f"Entry '{entry_id}' not found")
    return MemoryEntry(**entry)


# ── DELETE /memory/clear ───────────────────────────────────────────────────
@router.delete(
    "/clear",
    response_model=ClearResponse,
    summary="Clear all history",
)
async def clear_history() -> ClearResponse:
    try:
        deleted = _store.clear()
        return ClearResponse(success=True, deleted=deleted, message=f"Deleted {deleted} entries")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to clear: {exc}") from exc


# ── DELETE /memory/{id} ────────────────────────────────────────────────────
@router.delete(
    "/{entry_id}",
    response_model=DeleteResponse,
    summary="Delete a memory entry",
)
async def delete_entry(entry_id: str) -> DeleteResponse:
    if not _store.delete(entry_id):
        raise HTTPException(status_code=404, detail=f"Entry '{entry_id}' not found")
    return DeleteResponse(success=True, id=entry_id)
