from pydantic import BaseModel, Field, field_validator
from typing import List
from enum import Enum


class Complexity(str, Enum):
    simple   = "Simple"
    moderate = "Moderate"
    complex  = "Complex"


class TaskRequest(BaseModel):
    task: str = Field(..., min_length=3, max_length=2000, description="The task to plan")

    @field_validator("task")
    @classmethod
    def strip_task(cls, v: str) -> str:
        return v.strip()


class PlanResponse(BaseModel):
    task:                 str        = Field(..., description="Original task text")
    task_type:            str        = Field(..., description="Detected task category")
    steps:                List[str]  = Field(..., description="Ordered execution steps")
    estimated_complexity: Complexity = Field(..., description="Simple | Moderate | Complex")
