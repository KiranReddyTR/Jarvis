"""
Planner service — detects task type and returns a structured execution plan.
"""
import re
from typing import List, Dict


# ---------------------------------------------------------------------------
# Task-type detection patterns
# ---------------------------------------------------------------------------
TASK_PATTERNS: Dict[str, List[str]] = {
    "code": [
        r"\b(code|program|script|function|class|api|build|develop|implement|debug|fix|refactor|backend|frontend|deploy)\b"
    ],
    "write": [
        r"\b(write|draft|essay|article|blog|email|letter|report|document|summarize|summarise|content|copy)\b"
    ],
    "analyze": [
        r"\b(analyze|analyse|research|study|compare|evaluate|review|assess|investigate|audit|benchmark)\b"
    ],
    "creative": [
        r"\b(create|design|generate|imagine|story|poem|creative|brainstorm|idea|concept|invent)\b"
    ],
    "data": [
        r"\b(data|dataset|csv|excel|spreadsheet|chart|graph|visualize|statistics|sql|database|query|etl)\b"
    ],
    "explain": [
        r"\b(explain|teach|how|what|why|understand|learn|tutorial|guide|overview|introduction)\b"
    ],
}

# ---------------------------------------------------------------------------
# Step templates per task type
# ---------------------------------------------------------------------------
STEP_TEMPLATES: Dict[str, List[str]] = {
    "code": [
        "Define requirements, inputs, outputs, and acceptance criteria",
        "Choose the appropriate language, framework, and libraries",
        "Design the architecture, data models, and component interfaces",
        "Implement the core logic incrementally with clear commits",
        "Add input validation, error handling, and edge-case coverage",
        "Write unit and integration tests; achieve meaningful coverage",
        "Refactor for readability, performance, and maintainability",
    ],
    "write": [
        "Clarify the purpose, target audience, tone, and word count",
        "Research the topic and gather credible sources",
        "Create a structured outline with sections and key points",
        "Write the first draft following the outline",
        "Revise for clarity, logical flow, and coherence",
        "Proofread for grammar, spelling, punctuation, and style",
        "Finalize formatting and prepare for publication",
    ],
    "analyze": [
        "Define the scope, objectives, and success metrics",
        "Identify and collect relevant data or information sources",
        "Apply appropriate analytical frameworks or methodologies",
        "Identify patterns, trends, anomalies, and key insights",
        "Validate findings and check for biases or gaps",
        "Synthesize conclusions and actionable recommendations",
        "Present findings in a clear, structured, and visual format",
    ],
    "creative": [
        "Define the creative brief, constraints, and target audience",
        "Brainstorm a wide range of ideas without self-filtering",
        "Select and develop the most promising concepts",
        "Create a detailed outline, storyboard, or prototype",
        "Iterate and refine based on feedback and testing",
        "Polish and finalize the creative output",
    ],
    "data": [
        "Define the data question, hypothesis, or business goal",
        "Identify, acquire, and document the relevant datasets",
        "Clean, validate, and preprocess the data",
        "Perform exploratory data analysis (EDA) to understand distributions",
        "Apply statistical methods, ML models, or aggregations as needed",
        "Visualize results with clear, labeled charts and graphs",
        "Document methodology, assumptions, and findings",
    ],
    "explain": [
        "Identify the core concept and calibrate for the target audience",
        "Break the topic into its fundamental components",
        "Find relatable analogies and concrete real-world examples",
        "Structure the explanation from simple to complex (scaffolding)",
        "Anticipate common questions, misconceptions, and edge cases",
        "Summarize key takeaways and suggest next learning steps",
    ],
    "general": [
        "Clarify the goal and define measurable success criteria",
        "Break the task into smaller, manageable sub-tasks",
        "Identify required resources, tools, and dependencies",
        "Execute each sub-task in logical, dependency-aware order",
        "Review progress and adjust the plan as blockers arise",
        "Validate the final output against the original goal",
    ],
}

# ---------------------------------------------------------------------------
# Complexity scoring
# ---------------------------------------------------------------------------
def _estimate_complexity(task: str, steps: List[str]) -> str:
    score = len(task.split()) // 5 + len(steps)
    if score <= 4:
        return "Simple"
    if score <= 8:
        return "Moderate"
    return "Complex"


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------
class PlannerService:
    """Breaks a free-text task into a typed, step-by-step execution plan."""

    def _detect_task_type(self, task: str) -> str:
        task_lower = task.lower()
        for task_type, patterns in TASK_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, task_lower):
                    return task_type
        return "general"

    def break_down_task(self, task: str) -> Dict:
        task_type  = self._detect_task_type(task)
        steps      = STEP_TEMPLATES.get(task_type, STEP_TEMPLATES["general"])
        complexity = _estimate_complexity(task, steps)

        return {
            "task":                 task,
            "task_type":            task_type,
            "steps":                steps,
            "estimated_complexity": complexity,
        }
