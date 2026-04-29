"""
Feedback router
===============
POST /feedback/          — submit thumbs up/down, get improved prompt back
GET  /feedback/stats     — aggregate vote counts and improvement stats
"""
from fastapi import APIRouter, HTTPException
from models.feedback import QuickFeedbackRequest, FeedbackResponse, ImprovementDetail
from services.memory_store import MemoryStore
from services.feedback_engine import FeedbackEngine

router  = APIRouter()
_store  = MemoryStore()
_engine = FeedbackEngine()

# Map vote → numeric rating for the memory store (1–5 scale)
_VOTE_TO_RATING = {"up": 5, "down": 2}


@router.post(
    "/",
    response_model=FeedbackResponse,
    summary="Submit quick feedback",
    description=(
        "Accepts a 👍 or 👎 vote on a prompt. "
        "Applies rule-based improvements and returns the improved prompt. "
        "Also persists the vote to memory for scoring."
    ),
)
async def submit_quick_feedback(req: QuickFeedbackRequest) -> FeedbackResponse:
    # 1. Load the original entry
    entry = _store.get_by_id(req.entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail=f"Entry '{req.entry_id}' not found")

    # 2. Apply rule-based improvements
    result = _engine.improve(
        system_prompt = entry["system_prompt"],
        user_prompt   = entry["user_prompt"],
        vote          = req.vote.value,
        task_type     = entry.get("task_type", "general"),
        tool          = entry["tool"],
        comment       = req.comment,
    )

    # 3. Persist vote as a rating + store improved prompts
    rating = _VOTE_TO_RATING[req.vote.value]
    _store.add_feedback(
        entry_id = req.entry_id,
        rating   = rating,
        comment  = req.comment,
        reused   = False,
    )

    # 4. If improved, update the stored prompts so future retrievals get the better version
    if result["improved"]:
        _store.update_prompts(
            entry_id      = req.entry_id,
            system_prompt = result["system_prompt"],
            user_prompt   = result["user_prompt"],
        )

    # 5. Build response
    n = len(result["improvements"])
    if req.vote == "up":
        message = f"Thumbs up! Prompt reinforced{f' with {n} enhancement' + ('s' if n != 1 else '') if n else ''}."
    else:
        message = (
            f"Thumbs down noted. {n} improvement{'s' if n != 1 else ''} applied to the prompt."
            if n else
            "Thumbs down noted. Prompt flagged for review."
        )

    return FeedbackResponse(
        entry_id      = req.entry_id,
        vote          = req.vote.value,
        improved      = result["improved"],
        improvements  = [ImprovementDetail(**i) for i in result["improvements"]],
        system_prompt = result["system_prompt"],
        user_prompt   = result["user_prompt"],
        message       = message,
    )


@router.get(
    "/stats",
    summary="Feedback statistics",
    description="Returns aggregate thumbs up/down counts and improvement rates.",
)
async def get_feedback_stats():
    stats = _store.get_stats()
    total_rated = stats.get("rated_count", 0)
    # rating >= 4 = thumbs up (we store 5), rating <= 3 = thumbs down (we store 2)
    with _store._conn() as conn:
        up_count = conn.execute(
            "SELECT COUNT(*) FROM memory_entries WHERE rating >= 4"
        ).fetchone()[0]
        down_count = conn.execute(
            "SELECT COUNT(*) FROM memory_entries WHERE rating <= 3 AND rating IS NOT NULL"
        ).fetchone()[0]

    return {
        "total_rated":   total_rated,
        "thumbs_up":     up_count,
        "thumbs_down":   down_count,
        "approval_rate": round(up_count / total_rated, 2) if total_rated else None,
    }
