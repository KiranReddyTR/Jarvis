from fastapi import APIRouter, HTTPException
from models.plan import TaskRequest, PlanResponse
from services.planner import PlannerService

router = APIRouter()
_svc = PlannerService()


@router.post(
    "/",
    response_model=PlanResponse,
    summary="Break a task into steps",
    description="Detects the task type and returns an ordered execution plan with complexity estimate.",
)
async def create_plan(request: TaskRequest) -> PlanResponse:
    try:
        result = _svc.break_down_task(request.task)
        return PlanResponse(**result)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Planning failed: {exc}") from exc
