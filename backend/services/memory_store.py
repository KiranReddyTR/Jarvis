"""
Memory Store — SQLite backend
==============================
Stores tasks, prompts, AI model used, and user feedback.
Uses Python's built-in sqlite3 — zero extra dependencies.

Schema
------
  memory_entries
    id            TEXT  PRIMARY KEY
    task          TEXT  NOT NULL
    task_type     TEXT  NOT NULL DEFAULT 'general'
    steps         TEXT  NOT NULL          -- JSON array
    tool          TEXT  NOT NULL
    system_prompt TEXT  NOT NULL
    user_prompt   TEXT  NOT NULL
    tags          TEXT  NOT NULL DEFAULT '[]'  -- JSON array
    rating        INTEGER                  -- 1-5, nullable
    feedback      TEXT                     -- free-text comment, nullable
    reuse_count   INTEGER NOT NULL DEFAULT 0
    score         REAL    NOT NULL DEFAULT 0.0
    created_at    TEXT    NOT NULL
    updated_at    TEXT    NOT NULL
"""
import json
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Generator, List, Optional

DB_PATH = Path(__file__).parent.parent / "data" / "memory.db"

# Score weights
W_RATING    = 0.50   # rating (1-5) normalised to 0-1
W_REUSE     = 0.30   # reuse count (log-scaled, capped at 10)
W_RECENCY   = 0.20   # recency (1.0 = today, decays over 30 days)

import math
from datetime import timedelta


def _compute_score(rating: Optional[int], reuse_count: int, created_at: str) -> float:
    """Weighted quality score in [0, 1]."""
    r_score = ((rating - 1) / 4) if rating else 0.0
    u_score = min(math.log1p(reuse_count) / math.log1p(10), 1.0)
    try:
        age_days = (datetime.now(timezone.utc) - datetime.fromisoformat(created_at)).days
    except Exception:
        age_days = 0
    t_score = max(0.0, 1.0 - age_days / 30)
    return round(W_RATING * r_score + W_REUSE * u_score + W_RECENCY * t_score, 4)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _row_to_dict(row: sqlite3.Row) -> Dict:
    d = dict(row)
    d["steps"] = json.loads(d["steps"])
    d["tags"]  = json.loads(d.get("tags") or "[]")
    return d


class MemoryStore:
    """SQLite-backed memory system for tasks, prompts, AI models, and feedback."""

    def __init__(self) -> None:
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    # ── DB setup ───────────────────────────────────────────────────────────
    @contextmanager
    def _conn(self) -> Generator[sqlite3.Connection, None, None]:
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")   # better concurrency
        conn.execute("PRAGMA foreign_keys=ON")
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def _init_db(self) -> None:
        with self._conn() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS memory_entries (
                    id            TEXT    PRIMARY KEY,
                    task          TEXT    NOT NULL,
                    task_type     TEXT    NOT NULL DEFAULT 'general',
                    steps         TEXT    NOT NULL,
                    tool          TEXT    NOT NULL,
                    system_prompt TEXT    NOT NULL,
                    user_prompt   TEXT    NOT NULL,
                    tags          TEXT    NOT NULL DEFAULT '[]',
                    rating        INTEGER,
                    feedback      TEXT,
                    reuse_count   INTEGER NOT NULL DEFAULT 0,
                    score         REAL    NOT NULL DEFAULT 0.0,
                    created_at    TEXT    NOT NULL,
                    updated_at    TEXT    NOT NULL
                )
            """)
            # Indexes for common query patterns
            conn.execute("CREATE INDEX IF NOT EXISTS idx_tool      ON memory_entries(tool)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_task_type ON memory_entries(task_type)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_rating    ON memory_entries(rating)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_score     ON memory_entries(score DESC)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_created   ON memory_entries(created_at DESC)")

    # ── Save ───────────────────────────────────────────────────────────────
    def save(
        self,
        task:          str,
        steps:         List[str],
        tool:          str,
        system_prompt: str,
        user_prompt:   str,
        task_type:     str       = "general",
        tags:          List[str] = None,
    ) -> Dict:
        """Insert a new memory entry and return it."""
        now   = _now()
        entry = {
            "id":            str(uuid.uuid4()),
            "task":          task,
            "task_type":     task_type,
            "steps":         json.dumps(steps, ensure_ascii=False),
            "tool":          tool,
            "system_prompt": system_prompt,
            "user_prompt":   user_prompt,
            "tags":          json.dumps(tags or [], ensure_ascii=False),
            "rating":        None,
            "feedback":      None,
            "reuse_count":   0,
            "score":         _compute_score(None, 0, now),
            "created_at":    now,
            "updated_at":    now,
        }
        with self._conn() as conn:
            conn.execute("""
                INSERT INTO memory_entries
                  (id, task, task_type, steps, tool, system_prompt, user_prompt,
                   tags, rating, feedback, reuse_count, score, created_at, updated_at)
                VALUES
                  (:id, :task, :task_type, :steps, :tool, :system_prompt, :user_prompt,
                   :tags, :rating, :feedback, :reuse_count, :score, :created_at, :updated_at)
            """, entry)
        return self.get_by_id(entry["id"])

    # ── Feedback ───────────────────────────────────────────────────────────
    def add_feedback(
        self,
        entry_id: str,
        rating:   int,
        comment:  Optional[str] = None,
        reused:   bool          = False,
    ) -> Optional[Dict]:
        """Update rating, feedback comment, and optionally increment reuse count."""
        existing = self.get_by_id(entry_id)
        if not existing:
            return None

        new_reuse = existing["reuse_count"] + (1 if reused else 0)
        new_score = _compute_score(rating, new_reuse, existing["created_at"])
        now       = _now()

        with self._conn() as conn:
            conn.execute("""
                UPDATE memory_entries
                SET rating      = ?,
                    feedback    = ?,
                    reuse_count = ?,
                    score       = ?,
                    updated_at  = ?
                WHERE id = ?
            """, (rating, comment, new_reuse, new_score, now, entry_id))

        return self.get_by_id(entry_id)

    # ── Increment reuse ────────────────────────────────────────────────────
    def increment_reuse(self, entry_id: str) -> Optional[Dict]:
        """Increment reuse_count and recompute score."""
        existing = self.get_by_id(entry_id)
        if not existing:
            return None

        new_reuse = existing["reuse_count"] + 1
        new_score = _compute_score(existing["rating"], new_reuse, existing["created_at"])

        with self._conn() as conn:
            conn.execute("""
                UPDATE memory_entries
                SET reuse_count = ?, score = ?, updated_at = ?
                WHERE id = ?
            """, (new_reuse, new_score, _now(), entry_id))

        return self.get_by_id(entry_id)

    # ── Queries ────────────────────────────────────────────────────────────
    def get_by_id(self, entry_id: str) -> Optional[Dict]:
        with self._conn() as conn:
            row = conn.execute(
                "SELECT * FROM memory_entries WHERE id = ?", (entry_id,)
            ).fetchone()
        return _row_to_dict(row) if row else None

    def get_all(
        self,
        search:    Optional[str] = None,
        tool:      Optional[str] = None,
        task_type: Optional[str] = None,
        tag:       Optional[str] = None,
        sort_by:   str           = "newest",
        limit:     int           = 50,
        offset:    int           = 0,
    ) -> Dict:
        """Return filtered, sorted, paginated entries."""
        where, params = self._build_where(search, tool, task_type, tag)
        order = {
            "newest":  "created_at DESC",
            "oldest":  "created_at ASC",
            "rating":  "rating DESC NULLS LAST, created_at DESC",
            "reused":  "reuse_count DESC, created_at DESC",
        }.get(sort_by, "created_at DESC")

        base_sql = f"FROM memory_entries{where}"

        with self._conn() as conn:
            total = conn.execute(
                f"SELECT COUNT(*) {base_sql}", params
            ).fetchone()[0]

            rows = conn.execute(
                f"SELECT * {base_sql} ORDER BY {order} LIMIT ? OFFSET ?",
                params + [limit, offset],
            ).fetchall()

        return {"total": total, "entries": [_row_to_dict(r) for r in rows]}

    def get_best_prompts(
        self,
        tool:      Optional[str] = None,
        task_type: Optional[str] = None,
        min_rating: int          = 3,
        limit:     int           = 10,
    ) -> Dict:
        """
        Return top-ranked prompts by composite score.
        Only includes entries that have been rated OR reused at least once.
        """
        conditions = ["(rating >= ? OR reuse_count > 0)"]
        params: List = [min_rating]

        if tool:
            conditions.append("tool = ?")
            params.append(tool)
        if task_type:
            conditions.append("task_type = ?")
            params.append(task_type)

        where = " WHERE " + " AND ".join(conditions)

        with self._conn() as conn:
            total = conn.execute(
                f"SELECT COUNT(*) FROM memory_entries{where}", params
            ).fetchone()[0]

            rows = conn.execute(
                f"SELECT * FROM memory_entries{where} "
                f"ORDER BY score DESC, rating DESC NULLS LAST, reuse_count DESC "
                f"LIMIT ?",
                params + [limit],
            ).fetchall()

        return {"total": total, "entries": [_row_to_dict(r) for r in rows]}

    def get_stats(self) -> Dict:
        """Return aggregate statistics across all entries."""
        with self._conn() as conn:
            total = conn.execute(
                "SELECT COUNT(*) FROM memory_entries"
            ).fetchone()[0]

            avg_rating = conn.execute(
                "SELECT AVG(rating) FROM memory_entries WHERE rating IS NOT NULL"
            ).fetchone()[0]

            top_tool = conn.execute(
                "SELECT tool, COUNT(*) as c FROM memory_entries "
                "GROUP BY tool ORDER BY c DESC LIMIT 1"
            ).fetchone()

            top_type = conn.execute(
                "SELECT task_type, COUNT(*) as c FROM memory_entries "
                "GROUP BY task_type ORDER BY c DESC LIMIT 1"
            ).fetchone()

            total_reuses = conn.execute(
                "SELECT COALESCE(SUM(reuse_count), 0) FROM memory_entries"
            ).fetchone()[0]

            rated_count = conn.execute(
                "SELECT COUNT(*) FROM memory_entries WHERE rating IS NOT NULL"
            ).fetchone()[0]

            tool_rows = conn.execute(
                "SELECT tool, COUNT(*) as c FROM memory_entries GROUP BY tool"
            ).fetchall()

        return {
            "total_tasks":   total,
            "avg_rating":    round(avg_rating, 2) if avg_rating else None,
            "top_tool":      top_tool["tool"] if top_tool else None,
            "top_task_type": top_type["task_type"] if top_type else None,
            "total_reuses":  total_reuses,
            "rated_count":   rated_count,
            "tool_breakdown": {r["tool"]: r["c"] for r in tool_rows},
        }

    # ── Delete ─────────────────────────────────────────────────────────────
    def delete(self, entry_id: str) -> bool:
        with self._conn() as conn:
            affected = conn.execute(
                "DELETE FROM memory_entries WHERE id = ?", (entry_id,)
            ).rowcount
        return affected > 0

    def clear(self) -> int:
        """Delete all entries. Returns count of deleted rows."""
        with self._conn() as conn:
            count = conn.execute(
                "SELECT COUNT(*) FROM memory_entries"
            ).fetchone()[0]
            conn.execute("DELETE FROM memory_entries")
        return count

    def update_prompts(
        self,
        entry_id:      str,
        system_prompt: str,
        user_prompt:   str,
    ) -> None:
        """Overwrite the stored prompts with improved versions."""
        with self._conn() as conn:
            conn.execute(
                "UPDATE memory_entries SET system_prompt=?, user_prompt=?, updated_at=? WHERE id=?",
                (system_prompt, user_prompt, _now(), entry_id),
            )

    # ── Helpers ────────────────────────────────────────────────────────────
    @staticmethod
    def _build_where(
        search:    Optional[str],
        tool:      Optional[str],
        task_type: Optional[str],
        tag:       Optional[str],
    ):
        conditions, params = [], []
        if search:
            conditions.append("task LIKE ?")
            params.append(f"%{search}%")
        if tool:
            conditions.append("tool = ?")
            params.append(tool)
        if task_type:
            conditions.append("task_type = ?")
            params.append(task_type)
        if tag:
            # Tags stored as JSON array — use LIKE for simple substring match
            conditions.append("tags LIKE ?")
            params.append(f'%"{tag.lower()}"%')
        where = (" WHERE " + " AND ".join(conditions)) if conditions else ""
        return where, params
