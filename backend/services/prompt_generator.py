"""
Prompt Generation Engine
========================
Converts a user task into a fully structured prompt with:
  - Role        : Who the AI should act as
  - Instructions: Step-by-step directives
  - Output Format: How the response should look
  - Constraints : Rules and guardrails
  - Examples    : Few-shot starters

Prompts are reusable, storable, and optimised per AI tool.
"""
from typing import List, Dict, Optional


# ── Role personas per task type ────────────────────────────────────────────
ROLES: Dict[str, Dict[str, str]] = {
    "code": {
        "ChatGPT": (
            "You are a senior software engineer with 15+ years of experience across "
            "backend, frontend, and systems programming. You write clean, well-tested, "
            "production-ready code with clear inline comments and type annotations."
        ),
        "Claude": (
            "You are an expert software architect who prioritises code clarity, "
            "maintainability, and security. You explain design decisions thoroughly "
            "and flag potential pitfalls before they become problems."
        ),
        "Gemini": (
            "You are a full-stack engineer with deep expertise in modern frameworks "
            "and cloud infrastructure. You combine technical precision with practical "
            "implementation guidance and up-to-date best practices."
        ),
    },
    "write": {
        "ChatGPT": (
            "You are a professional content writer and editor with expertise in "
            "crafting engaging, well-structured written content for diverse audiences. "
            "You adapt tone and style to match the purpose and reader."
        ),
        "Claude": (
            "You are a skilled author and writing coach who excels at long-form content, "
            "nuanced argumentation, and editorial refinement. You produce polished, "
            "publication-ready writing with strong narrative flow."
        ),
        "Gemini": (
            "You are a versatile content strategist who combines research-backed writing "
            "with SEO awareness and audience engagement. You produce content that is "
            "both informative and compelling."
        ),
    },
    "analyze": {
        "ChatGPT": (
            "You are a strategic analyst with expertise in breaking down complex problems, "
            "identifying patterns, and delivering clear, evidence-based insights. "
            "You structure analysis logically and highlight actionable findings."
        ),
        "Claude": (
            "You are a research analyst and critical thinker who examines topics from "
            "multiple angles, acknowledges uncertainty, and produces balanced, "
            "well-reasoned assessments with clear methodology."
        ),
        "Gemini": (
            "You are a data-driven analyst who combines quantitative methods with "
            "qualitative reasoning. You leverage current information and present "
            "findings with supporting evidence and visual clarity."
        ),
    },
    "creative": {
        "ChatGPT": (
            "You are a creative director and ideation expert who generates original, "
            "imaginative concepts. You balance creative ambition with practical "
            "feasibility and help develop ideas from spark to execution."
        ),
        "Claude": (
            "You are a thoughtful creative writer and concept developer who crafts "
            "narratives with depth, originality, and emotional resonance. "
            "You explore ideas thoroughly before committing to a direction."
        ),
        "Gemini": (
            "You are a multimodal creative professional who brings ideas to life "
            "across text, visuals, and interactive formats. You combine creative "
            "vision with technical execution capability."
        ),
    },
    "data": {
        "ChatGPT": (
            "You are a data scientist and analyst with expertise in statistical methods, "
            "machine learning, and data visualisation. You translate raw data into "
            "clear insights with reproducible methodology."
        ),
        "Claude": (
            "You are a quantitative researcher who applies rigorous statistical thinking "
            "to data problems. You document assumptions, validate findings, and "
            "communicate results clearly to both technical and non-technical audiences."
        ),
        "Gemini": (
            "You are a data engineer and analyst with expertise in SQL, Python, and "
            "modern data tools. You handle data pipelines, analysis, and visualisation "
            "with precision and leverage real-time information where relevant."
        ),
    },
    "explain": {
        "ChatGPT": (
            "You are an expert educator and technical communicator who makes complex "
            "topics accessible. You use analogies, examples, and progressive scaffolding "
            "to build genuine understanding in your audience."
        ),
        "Claude": (
            "You are a patient, thorough teacher who anticipates confusion and addresses "
            "it proactively. You explain concepts from first principles, acknowledge "
            "nuance, and ensure the learner leaves with real comprehension."
        ),
        "Gemini": (
            "You are a knowledgeable guide who combines clear explanations with "
            "current examples and visual thinking. You adapt your teaching style "
            "to the learner's level and use concrete, real-world illustrations."
        ),
    },
    "general": {
        "ChatGPT": (
            "You are a highly capable, knowledgeable assistant with broad expertise. "
            "You approach tasks methodically, provide accurate information, and "
            "deliver clear, actionable responses tailored to the user's needs."
        ),
        "Claude": (
            "You are a thoughtful, careful assistant who prioritises accuracy, nuance, "
            "and helpfulness. You consider multiple perspectives, acknowledge limitations, "
            "and provide well-reasoned, comprehensive responses."
        ),
        "Gemini": (
            "You are a versatile, resourceful assistant with access to broad knowledge "
            "and multimodal capabilities. You combine accuracy with practical utility "
            "and leverage current information to provide the best possible help."
        ),
    },
}

# ── Output format instructions ─────────────────────────────────────────────
OUTPUT_FORMAT_INSTRUCTIONS: Dict[str, str] = {
    "markdown": (
        "Format your response using Markdown:\n"
        "- Use ## for main sections, ### for subsections\n"
        "- Use **bold** for key terms and `code` for technical terms\n"
        "- Use bullet lists for enumerations and numbered lists for sequences\n"
        "- Use code blocks (```language) for all code snippets"
    ),
    "json": (
        "Return your response as valid, pretty-printed JSON.\n"
        "Use descriptive keys. Nest objects logically.\n"
        "Do not include any text outside the JSON structure."
    ),
    "plain": (
        "Write in plain prose without any special formatting.\n"
        "Use short paragraphs. Avoid bullet points, headers, or markdown.\n"
        "Write as if composing a professional email or document."
    ),
    "numbered": (
        "Structure your entire response as a numbered list.\n"
        "Each item should be a complete, self-contained point.\n"
        "Use sub-numbers (1.1, 1.2) for nested details."
    ),
    "bullets": (
        "Structure your response using bullet points throughout.\n"
        "Group related points under bold category headers.\n"
        "Keep each bullet concise — one idea per bullet."
    ),
    "code": (
        "Return primarily code with minimal prose.\n"
        "Include a brief comment block at the top explaining what the code does.\n"
        "Add inline comments for non-obvious logic.\n"
        "Include usage examples at the bottom."
    ),
}

# ── Tone modifiers ─────────────────────────────────────────────────────────
TONE_MODIFIERS: Dict[str, str] = {
    "professional": "Maintain a professional, authoritative tone throughout.",
    "concise":      "Be as concise as possible. Eliminate all unnecessary words. Prioritise brevity.",
    "detailed":     "Be thorough and comprehensive. Cover edge cases, nuances, and alternatives.",
    "creative":     "Bring creativity and originality. Use vivid language and unexpected angles.",
    "technical":    "Use precise technical language. Assume an expert audience. Include specifics.",
}

# ── Per-tool usage tips ────────────────────────────────────────────────────
TIPS: Dict[str, List[str]] = {
    "ChatGPT": [
        "Use GPT-4o for best results on complex or multi-step tasks",
        "Prepend 'Think step by step:' to improve reasoning quality",
        "Ask for code with comments, type hints, and error handling",
        "Use follow-up messages to iteratively refine the output",
        "Use the system prompt field in the API for the role section",
    ],
    "Claude": [
        "Claude handles very long documents — paste the full text for analysis",
        "Use XML tags like <task>, <context>, and <constraints> to structure prompts",
        "Ask for 'pros and cons' or 'multiple perspectives' for balanced output",
        "Claude 3.5 Sonnet is the best balance of speed and quality",
        "Use the system parameter in the API for the role section",
    ],
    "Gemini": [
        "Attach images or files to unlock multimodal analysis",
        "Ask Gemini to search for the latest information on the topic",
        "Use Google AI Studio for API access and advanced configuration",
        "Gemini 1.5 Pro handles very long contexts (up to 1M tokens)",
        "Use the systemInstruction field in the API for the role section",
    ],
}

# ── Few-shot example starters per task type ────────────────────────────────
EXAMPLE_STARTERS: Dict[str, str] = {
    "code": (
        "**Example interaction:**\n"
        "User: 'Write a Python function to validate email addresses'\n"
        "Assistant: [Provides function with type hints, docstring, regex, and unit tests]"
    ),
    "write": (
        "**Example interaction:**\n"
        "User: 'Write an intro paragraph for a blog post about remote work'\n"
        "Assistant: [Provides engaging hook, context, and thesis statement]"
    ),
    "analyze": (
        "**Example interaction:**\n"
        "User: 'Compare REST vs GraphQL for a mobile app backend'\n"
        "Assistant: [Provides structured comparison with pros, cons, and recommendation]"
    ),
    "creative": (
        "**Example interaction:**\n"
        "User: 'Generate 5 unique product name ideas for a productivity app'\n"
        "Assistant: [Provides names with rationale, tone, and target audience notes]"
    ),
    "data": (
        "**Example interaction:**\n"
        "User: 'Explain how to calculate churn rate from a CSV of user events'\n"
        "Assistant: [Provides formula, Python code, and interpretation guidance]"
    ),
    "explain": (
        "**Example interaction:**\n"
        "User: 'Explain how transformers work to a software developer'\n"
        "Assistant: [Provides analogy, architecture overview, and practical implications]"
    ),
    "general": (
        "**Example interaction:**\n"
        "User: [Describes their task clearly with context]\n"
        "Assistant: [Provides structured, thorough response addressing all aspects]"
    ),
}


# ── Engine ─────────────────────────────────────────────────────────────────
class PromptGeneratorService:
    """
    Converts a user task into a fully structured, reusable prompt.
    Each prompt has five sections: Role, Instructions, Output Format,
    Constraints, and Examples — assembled into system + user prompts.
    """

    def generate(
        self,
        task:          str,
        steps:         List[str],
        tool:          str,
        task_type:     str  = "general",
        output_format: str  = "markdown",
        tone:          str  = "professional",
        context:       Optional[str] = None,
    ) -> Dict:
        sections = self._build_sections(
            task, steps, tool, task_type, output_format, tone, context
        )
        system_prompt = self._assemble_system_prompt(sections)
        user_prompt   = self._assemble_user_prompt(sections, task, steps)

        return {
            "tool":          tool,
            "system_prompt": system_prompt,
            "user_prompt":   user_prompt,
            "sections":      sections,
            "tips":          TIPS.get(tool, TIPS["ChatGPT"]),
        }

    # ── Section builders ───────────────────────────────────────────────────
    def _build_sections(
        self,
        task:          str,
        steps:         List[str],
        tool:          str,
        task_type:     str,
        output_format: str,
        tone:          str,
        context:       Optional[str],
    ) -> Dict:
        role = (
            ROLES.get(task_type, ROLES["general"])
            .get(tool, ROLES["general"]["ChatGPT"])
        )

        instructions = self._build_instructions(task, steps, context)
        fmt          = self._build_output_format(output_format, task_type)
        constraints  = self._build_constraints(tone, tool, task_type)
        examples     = EXAMPLE_STARTERS.get(task_type, EXAMPLE_STARTERS["general"])

        return {
            "role":          role,
            "instructions":  instructions,
            "output_format": fmt,
            "constraints":   constraints,
            "examples":      examples,
        }

    def _build_instructions(
        self, task: str, steps: List[str], context: Optional[str]
    ) -> str:
        numbered = "\n".join(f"  {i+1}. {s}" for i, s in enumerate(steps))
        ctx_block = f"\n\n**Additional context / constraints:**\n{context}" if context else ""
        return (
            f"**Primary task:**\n{task}"
            f"{ctx_block}\n\n"
            f"**Work through these steps in order:**\n{numbered}\n\n"
            f"**For each step:**\n"
            f"  - Be explicit about your reasoning\n"
            f"  - Flag any assumptions you are making\n"
            f"  - Note alternatives where relevant"
        )

    def _build_output_format(self, output_format: str, task_type: str) -> str:
        base = OUTPUT_FORMAT_INSTRUCTIONS.get(
            output_format, OUTPUT_FORMAT_INSTRUCTIONS["markdown"]
        )
        # Add task-type specific additions
        additions = {
            "code":    "\n- Always include a 'Usage' section with runnable examples.",
            "write":   "\n- End with a 'Key Takeaways' or summary section.",
            "analyze": "\n- End with a 'Recommendation' or 'Conclusion' section.",
            "data":    "\n- Include a 'Methodology' note explaining your approach.",
        }
        return base + additions.get(task_type, "")

    def _build_constraints(self, tone: str, tool: str, task_type: str) -> str:
        tone_rule = TONE_MODIFIERS.get(tone, TONE_MODIFIERS["professional"])
        base_rules = [
            tone_rule,
            "Do not fabricate facts, statistics, or citations.",
            "If you are uncertain about something, say so explicitly.",
            "Stay focused on the task — do not add unrequested content.",
        ]
        tool_rules = {
            "ChatGPT": ["If writing code, always include error handling and type hints."],
            "Claude":  ["Use XML tags to clearly delineate sections of your response."],
            "Gemini":  ["Cite sources or note when information may be outdated."],
        }
        all_rules = base_rules + tool_rules.get(tool, [])
        return "\n".join(f"- {r}" for r in all_rules)

    # ── Assemblers ─────────────────────────────────────────────────────────
    def _assemble_system_prompt(self, sections: Dict) -> str:
        return (
            f"# Role\n{sections['role']}\n\n"
            f"# Constraints\n{sections['constraints']}\n\n"
            f"# Output Format\n{sections['output_format']}"
        )

    def _assemble_user_prompt(
        self, sections: Dict, task: str, steps: List[str]
    ) -> str:
        return (
            f"# Task Instructions\n{sections['instructions']}\n\n"
            f"# Expected Output Format\n{sections['output_format']}\n\n"
            f"# Reference Example\n{sections['examples']}"
        )
