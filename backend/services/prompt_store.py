"""
Prompt Store
============
Persists reusable, structured prompts to a JSON file.
Supports save, retrieve by ID, list with filters, tag search,
increment usage count, and delete.
"""
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Optional

STORE_FILE = Path(__file__).parent.parent / "data" / "prompts.json"


class PromptStore:
    """JSON-backed store for reusable structured prompts."""

    def __init__(self) -> None:
        STORE_FILE.parent.mkdir(parents=True, exist_ok=True)
        if not STORE_FILE.exists():
            STORE_FILE.write_text("[]", encoding="utf-8")

    # ── Private ────────────────────────────────────────────────────────────
    def _load(self) -> List[Dict]:
        try:
            raw = STORE_FILE.read_text(encoding="utf-8").strip()
            return json.loads(raw) if raw else []
        except (json.JSONDecodeError, FileNotFoundError):
            return []

    def _save(self, prompts: List[Dict]) -> None:
        STORE_FILE.write_text(
            json.dumps(prompts, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

    # ── Public API ─────────────────────────────────────────────────────────
    def save(
        self,
        task:          str,
        tool:          str,
        task_type:     str,
        output_format: str,
        tone:          str,
        system_prompt: str,
        user_prompt:   str,
        sections:      Dict,
        tags:          List[str],
    ) -> Dict:
        """Save a new prompt and return it with its generated ID."""
        prompts = self._load()
        entry: Dict = {
            "id":            str(uuid.uuid4()),
            "task":          task,
            "tool":          tool,
            "task_type":     task_type,
            "output_format": output_format,
            "tone":          tone,
            "system_prompt": system_prompt,
            "user_prompt":   user_prompt,
            "sections":      sections,
            "tags":          [t.lower().strip() for t in tags if t.strip()],
            "created_at":    datetime.now(timezone.utc).isoformat(),
            "used_count":    0,
        }
        prompts.append(entry)
        self._save(prompts)
        return entry

    def get_all(
        self,
        tool:      Optional[str] = None,
        task_type: Optional[str] = None,
        tag:       Optional[str] = None,
        search:    Optional[str] = None,
        limit:     int           = 50,
        offset:    int           = 0,
    ) -> Dict:
        """Return filtered, paginated prompts sorted by most-used then newest."""
        prompts = self._load()

        if tool:
            prompts = [p for p in prompts if p["tool"].lower() == tool.lower()]
        if task_type:
            prompts = [p for p in prompts if p["task_type"] == task_type]
        if tag:
            prompts = [p for p in prompts if tag.lower() in p.get("tags", [])]
        if search:
            q = search.lower()
            prompts = [p for p in prompts if q in p["task"].lower()]

        # Sort: most used first, then newest
        prompts.sort(key=lambda p: (-p.get("used_count", 0), p["created_at"]), reverse=False)
        prompts.sort(key=lambda p: p.get("used_count", 0), reverse=True)

        total = len(prompts)
        return {"total": total, "prompts": prompts[offset: offset + limit]}

    def get_by_id(self, prompt_id: str) -> Optional[Dict]:
        """Return a single prompt by ID."""
        return next((p for p in self._load() if p["id"] == prompt_id), None)

    def increment_usage(self, prompt_id: str) -> Optional[Dict]:
        """Increment the used_count for a prompt and return the updated entry."""
        prompts = self._load()
        for p in prompts:
            if p["id"] == prompt_id:
                p["used_count"] = p.get("used_count", 0) + 1
                self._save(prompts)
                return p
        return None

    def delete(self, prompt_id: str) -> bool:
        """Delete a prompt by ID. Returns True if found and deleted."""
        prompts  = self._load()
        filtered = [p for p in prompts if p["id"] != prompt_id]
        if len(filtered) == len(prompts):
            return False
        self._save(filtered)
        return True

    def get_tags(self) -> List[str]:
        """Return all unique tags across all saved prompts."""
        tags: set = set()
        for p in self._load():
            tags.update(p.get("tags", []))
        return sorted(tags)
