"""
Feedback Engine — Rule-Based Prompt Improvement
================================================
Analyses thumbs-up / thumbs-down signals and feedback comments,
then applies deterministic rules to improve the prompt.

No ML. No training. Pure rule-based logic.

Rules are organised into three layers:
  1. Signal rules   — based on thumbs up/down vote
  2. Pattern rules  — based on keywords in the feedback comment
  3. Context rules  — based on task_type + tool combination

Each rule returns a list of Improvement objects that describe
what changed and why.
"""
from __future__ import annotations
import re
from typing import Dict, List, Optional, Tuple


# ── Data structures ────────────────────────────────────────────────────────
class Improvement:
    """A single rule-based improvement applied to a prompt."""
    def __init__(self, field: str, reason: str, old: str, new: str):
        self.field  = field   # 'system_prompt' | 'user_prompt' | 'tone' | 'output_format'
        self.reason = reason  # human-readable explanation
        self.old    = old
        self.new    = new

    def to_dict(self) -> Dict:
        return {
            "field":  self.field,
            "reason": self.reason,
            "change": f"{self.old[:60]}…" if len(self.old) > 60 else self.old,
        }


# ── Keyword pattern → improvement mapping ─────────────────────────────────
# Each entry: (regex pattern, field, improvement_fn, reason)
COMMENT_RULES: List[Tuple] = [
    # Too long / verbose
    (
        r"\b(too long|too verbose|too wordy|shorter|concise|brief|tldr)\b",
        "user_prompt",
        lambda p: _inject_constraint(p, "Be concise. Limit your response to the essential points only."),
        "User found the prompt too verbose — added conciseness constraint",
    ),
    # Too short / needs more detail
    (
        r"\b(too short|more detail|more depth|elaborate|expand|comprehensive|thorough)\b",
        "user_prompt",
        lambda p: _inject_constraint(p, "Provide a comprehensive, detailed response. Cover edge cases and alternatives."),
        "User wanted more depth — added detail constraint",
    ),
    # Needs examples
    (
        r"\b(example|examples|show me|demonstrate|sample|illustration)\b",
        "user_prompt",
        lambda p: _inject_constraint(p, "Include at least 2 concrete, runnable examples to illustrate each key point."),
        "User requested examples — added examples requirement",
    ),
    # Needs simpler language
    (
        r"\b(too complex|too technical|simpler|simple|easier|beginner|layman|plain)\b",
        "system_prompt",
        lambda p: _replace_tone(p, "Explain everything in simple, plain language. Avoid jargon. Assume no prior expertise."),
        "User found it too complex — simplified tone in system prompt",
    ),
    # Needs more technical depth
    (
        r"\b(not technical|more technical|technical depth|advanced|expert|in-depth)\b",
        "system_prompt",
        lambda p: _replace_tone(p, "Use precise technical language. Assume an expert audience. Include implementation specifics, edge cases, and performance considerations."),
        "User wanted more technical depth — upgraded tone",
    ),
    # Needs structure / formatting
    (
        r"\b(unstructured|no structure|hard to read|format|formatting|headers|sections|organised|organized)\b",
        "user_prompt",
        lambda p: _inject_constraint(p, "Structure your response with clear ## headers for each section. Use bullet points for lists and numbered steps for sequences."),
        "User wanted better structure — added formatting constraint",
    ),
    # Off-topic / unfocused
    (
        r"\b(off.?topic|irrelevant|not relevant|focused|focus|stick to|only|just)\b",
        "user_prompt",
        lambda p: _inject_constraint(p, "Stay strictly focused on the task. Do not include tangential information or unsolicited advice."),
        "User found response unfocused — added focus constraint",
    ),
    # Needs code
    (
        r"\b(no code|needs code|show code|code example|implementation|working code)\b",
        "user_prompt",
        lambda p: _inject_constraint(p, "Include complete, working code examples with comments. Do not use pseudocode."),
        "User requested code — added code requirement",
    ),
    # Needs step-by-step
    (
        r"\b(step.?by.?step|steps|walkthrough|guide me|how to|instructions)\b",
        "user_prompt",
        lambda p: _inject_constraint(p, "Break down your response into clear, numbered steps. Each step should be actionable."),
        "User wanted step-by-step — added sequential structure",
    ),
    # Wrong tool suggestion
    (
        r"\b(wrong tool|different tool|switch|change tool|use claude|use chatgpt|use gemini)\b",
        "system_prompt",
        lambda p: _inject_note(p, "Note: The user may prefer a different AI tool. Ensure your response is tool-agnostic and portable."),
        "User questioned tool choice — added portability note",
    ),
]

# ── Task-type specific improvement rules ───────────────────────────────────
TASK_TYPE_IMPROVEMENTS: Dict[str, Dict] = {
    "code": {
        "thumbs_down": {
            "user_prompt_suffix": (
                "\n\n**Additional requirements after feedback:**\n"
                "- Include error handling for all edge cases\n"
                "- Add type annotations / type hints\n"
                "- Provide a brief explanation of the approach before the code\n"
                "- Include at least one usage example"
            ),
            "reason": "Code prompt improved: added error handling, types, explanation, and examples",
        },
        "thumbs_up": {
            "user_prompt_suffix": (
                "\n\n**Confirmed working approach — maintain this style:**\n"
                "- Keep the same level of detail and code quality\n"
                "- Continue including inline comments"
            ),
            "reason": "Code prompt reinforced: maintaining successful style",
        },
    },
    "write": {
        "thumbs_down": {
            "user_prompt_suffix": (
                "\n\n**Writing improvements requested:**\n"
                "- Vary sentence length for better rhythm\n"
                "- Use active voice throughout\n"
                "- Add a compelling hook in the opening\n"
                "- End with a clear call-to-action or summary"
            ),
            "reason": "Writing prompt improved: added style, voice, and structure guidance",
        },
        "thumbs_up": {
            "user_prompt_suffix": (
                "\n\n**Confirmed effective writing style — maintain:**\n"
                "- Keep the same tone and voice\n"
                "- Preserve the structural approach"
            ),
            "reason": "Writing prompt reinforced: maintaining successful style",
        },
    },
    "analyze": {
        "thumbs_down": {
            "user_prompt_suffix": (
                "\n\n**Analysis improvements requested:**\n"
                "- Support every claim with specific evidence or data\n"
                "- Present at least two opposing perspectives\n"
                "- Quantify findings where possible\n"
                "- End with a clear, actionable recommendation"
            ),
            "reason": "Analysis prompt improved: added evidence, perspectives, and recommendation requirements",
        },
        "thumbs_up": {
            "user_prompt_suffix": (
                "\n\n**Confirmed effective analysis approach — maintain:**\n"
                "- Keep the evidence-based reasoning style\n"
                "- Preserve the structured conclusion format"
            ),
            "reason": "Analysis prompt reinforced: maintaining successful approach",
        },
    },
    "data": {
        "thumbs_down": {
            "user_prompt_suffix": (
                "\n\n**Data analysis improvements:**\n"
                "- Show all intermediate calculation steps\n"
                "- Include Python/SQL code for reproducibility\n"
                "- Explain what each metric means in plain language\n"
                "- Note any assumptions or data quality issues"
            ),
            "reason": "Data prompt improved: added reproducibility and explanation requirements",
        },
        "thumbs_up": {
            "user_prompt_suffix": "",
            "reason": "Data prompt reinforced: no changes needed",
        },
    },
    "explain": {
        "thumbs_down": {
            "user_prompt_suffix": (
                "\n\n**Explanation improvements:**\n"
                "- Start with a one-sentence plain-English summary\n"
                "- Use an analogy to a familiar concept\n"
                "- Build complexity gradually — simple → intermediate → advanced\n"
                "- End with a 'Common Misconceptions' section"
            ),
            "reason": "Explanation prompt improved: added scaffolding and analogy requirements",
        },
        "thumbs_up": {
            "user_prompt_suffix": "",
            "reason": "Explanation prompt reinforced: no changes needed",
        },
    },
    "creative": {
        "thumbs_down": {
            "user_prompt_suffix": (
                "\n\n**Creative improvements:**\n"
                "- Generate at least 3 distinct variations\n"
                "- Explain the creative rationale for each\n"
                "- Include one unexpected / unconventional option\n"
                "- Rate each option by originality and feasibility"
            ),
            "reason": "Creative prompt improved: added variations and rationale requirements",
        },
        "thumbs_up": {
            "user_prompt_suffix": "",
            "reason": "Creative prompt reinforced: no changes needed",
        },
    },
    "general": {
        "thumbs_down": {
            "user_prompt_suffix": (
                "\n\n**General improvements:**\n"
                "- Be more specific and actionable\n"
                "- Structure the response with clear sections\n"
                "- Provide concrete next steps at the end"
            ),
            "reason": "General prompt improved: added specificity and structure",
        },
        "thumbs_up": {
            "user_prompt_suffix": "",
            "reason": "General prompt reinforced: no changes needed",
        },
    },
}

# ── Tool-specific system prompt boosters ──────────────────────────────────
TOOL_BOOSTERS: Dict[str, Dict[str, str]] = {
    "ChatGPT": {
        "thumbs_down": "Think carefully before responding. Break the problem into sub-problems. Show your reasoning explicitly.",
        "thumbs_up":   "Continue with the same structured, step-by-step approach.",
    },
    "Claude": {
        "thumbs_down": "Use <thinking> tags to reason through the problem before giving your final answer. Be thorough and consider edge cases.",
        "thumbs_up":   "Maintain the same careful, nuanced approach.",
    },
    "Gemini": {
        "thumbs_down": "Search for the most current information on this topic. Cite your sources. Prioritise accuracy over speed.",
        "thumbs_up":   "Continue with the same research-backed approach.",
    },
}


# ── String manipulation helpers ────────────────────────────────────────────
def _inject_constraint(prompt: str, constraint: str) -> str:
    """Append a constraint to the Output Requirements section, or add one."""
    marker = "## Output Requirements"
    if marker in prompt:
        return prompt.replace(
            marker,
            f"{marker}\n- {constraint}",
        )
    return prompt + f"\n\n## Additional Constraint\n- {constraint}"


def _inject_note(prompt: str, note: str) -> str:
    return prompt + f"\n\n> **Note:** {note}"


def _replace_tone(system_prompt: str, new_tone: str) -> str:
    """Replace the Constraints section tone line, or append."""
    lines = system_prompt.split("\n")
    for i, line in enumerate(lines):
        if line.startswith("- Maintain") or line.startswith("- Be as concise") or \
           line.startswith("- Be thorough") or line.startswith("- Bring creativity") or \
           line.startswith("- Use precise") or line.startswith("- Explain everything"):
            lines[i] = f"- {new_tone}"
            return "\n".join(lines)
    return system_prompt + f"\n- {new_tone}"


# ── Main engine ────────────────────────────────────────────────────────────
class FeedbackEngine:
    """
    Applies rule-based improvements to prompts based on user feedback.
    Returns improved prompts + a list of changes made.
    """

    def improve(
        self,
        system_prompt: str,
        user_prompt:   str,
        vote:          str,           # 'up' | 'down'
        task_type:     str = "general",
        tool:          str = "ChatGPT",
        comment:       Optional[str] = None,
    ) -> Dict:
        improvements: List[Improvement] = []
        new_system = system_prompt
        new_user   = user_prompt

        # ── Layer 1: Signal rules (thumbs up / down) ───────────────────────
        signal_key = "thumbs_up" if vote == "up" else "thumbs_down"

        # Task-type rule
        tt_rule = TASK_TYPE_IMPROVEMENTS.get(task_type, TASK_TYPE_IMPROVEMENTS["general"])
        tt_data = tt_rule.get(signal_key, {})
        suffix  = tt_data.get("user_prompt_suffix", "")
        if suffix and suffix not in new_user:
            old_user = new_user
            new_user = new_user + suffix
            improvements.append(Improvement(
                "user_prompt", tt_data["reason"], old_user, new_user
            ))

        # Tool booster in system prompt
        booster = TOOL_BOOSTERS.get(tool, {}).get(signal_key, "")
        if booster and booster not in new_system:
            old_sys  = new_system
            new_system = new_system + f"\n\n**Feedback-driven guidance:** {booster}"
            improvements.append(Improvement(
                "system_prompt",
                f"Added {tool}-specific guidance based on {vote} feedback",
                old_sys, new_system,
            ))

        # ── Layer 2: Comment pattern rules ────────────────────────────────
        if comment:
            comment_lower = comment.lower()
            for pattern, field, transform_fn, reason in COMMENT_RULES:
                if re.search(pattern, comment_lower):
                    if field == "user_prompt":
                        old = new_user
                        new_user = transform_fn(new_user)
                        if new_user != old:
                            improvements.append(Improvement(field, reason, old, new_user))
                    elif field == "system_prompt":
                        old = new_system
                        new_system = transform_fn(new_system)
                        if new_system != old:
                            improvements.append(Improvement(field, reason, old, new_system))

        # ── Layer 3: Thumbs-down with no comment → add clarification ask ──
        if vote == "down" and not comment and not improvements:
            old_user = new_user
            new_user = _inject_constraint(
                new_user,
                "Before answering, briefly restate your understanding of the task to confirm alignment.",
            )
            improvements.append(Improvement(
                "user_prompt",
                "Added clarification step — prompt was downvoted without specific feedback",
                old_user, new_user,
            ))

        return {
            "system_prompt": new_system,
            "user_prompt":   new_user,
            "improvements":  [i.to_dict() for i in improvements],
            "improved":      len(improvements) > 0,
        }
