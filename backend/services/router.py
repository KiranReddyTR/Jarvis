"""
Router service — scores AI tools against a task and returns a ranked recommendation.
"""
import re
from typing import List, Dict, Tuple


# ---------------------------------------------------------------------------
# Tool registry — add new tools here without touching any other file
# ---------------------------------------------------------------------------
AI_TOOLS: Dict[str, Dict] = {
    "ChatGPT": {
        "strengths": [
            "Code generation & debugging",
            "Conversational problem-solving",
            "Broad general knowledge",
            "Step-by-step reasoning",
        ],
        "keywords": [
            r"\b(code|program|debug|fix|script|function|api|build|develop|implement|refactor|backend|frontend)\b",
            r"\b(chat|conversation|explain|how|step.by.step|tutorial)\b",
        ],
        "base_score": 0.70,
    },
    "Claude": {
        "strengths": [
            "Long document analysis",
            "Nuanced writing & editing",
            "Complex reasoning & ethics",
            "Safety-conscious responses",
        ],
        "keywords": [
            r"\b(write|essay|document|analyze|analyse|review|summarize|summarise|research|report)\b",
            r"\b(long|detailed|nuanced|ethics|policy|legal|compliance|audit)\b",
        ],
        "base_score": 0.70,
    },
    "Gemini": {
        "strengths": [
            "Multimodal tasks (text + image)",
            "Real-time web information",
            "Data analysis & math",
            "Google ecosystem integration",
        ],
        "keywords": [
            r"\b(image|photo|visual|multimodal|video|diagram)\b",
            r"\b(data|math|calculate|statistics|chart|graph|spreadsheet|sql|latest|current|search)\b",
        ],
        "base_score": 0.70,
    },
}

BOOST_PER_MATCH = 0.04
MAX_SCORE       = 0.99


# ---------------------------------------------------------------------------
# Scoring helpers
# ---------------------------------------------------------------------------
def _score_tool(tool_name: str, combined_text: str) -> float:
    tool  = AI_TOOLS[tool_name]
    score = tool["base_score"]
    for pattern in tool["keywords"]:
        score += len(re.findall(pattern, combined_text)) * BOOST_PER_MATCH
    return min(round(score, 3), MAX_SCORE)


def _reason(tool_name: str, task: str) -> str:
    snippet = f'"{task[:70]}…"' if len(task) > 70 else f'"{task}"'
    reasons = {
        "ChatGPT": f"ChatGPT excels at interactive problem-solving and code tasks — well-suited for {snippet}.",
        "Claude":  f"Claude is ideal for nuanced analysis and long-form content — a strong fit for {snippet}.",
        "Gemini":  f"Gemini handles multimodal and data-rich tasks — a natural choice for {snippet}.",
    }
    return reasons.get(tool_name, f"{tool_name} is a strong choice for this task.")


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------
class RouterService:
    """Ranks AI tools by relevance to a given task and its execution steps."""

    def suggest_tool(self, task: str, steps: List[str]) -> Dict:
        combined = (task + " " + " ".join(steps)).lower()

        ranked: List[Tuple[str, float]] = sorted(
            ((name, _score_tool(name, combined)) for name in AI_TOOLS),
            key=lambda x: x[1],
            reverse=True,
        )

        primary_name, primary_score = ranked[0]

        primary = {
            "tool":       primary_name,
            "reason":     _reason(primary_name, task),
            "confidence": primary_score,
            "strengths":  AI_TOOLS[primary_name]["strengths"],
        }

        alternatives = [
            {
                "tool":       name,
                "reason":     _reason(name, task),
                "confidence": score,
                "strengths":  AI_TOOLS[name]["strengths"],
            }
            for name, score in ranked[1:]
        ]

        return {"primary_tool": primary, "alternatives": alternatives}
