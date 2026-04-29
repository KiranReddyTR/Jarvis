from fastapi import APIRouter, HTTPException
from models.route import RouteRequest, RouteResponse
from services.router import RouterService

router = APIRouter()
_svc = RouterService()


@router.post(
    "/",
    response_model=RouteResponse,
    summary="Route task to the best AI tool",
    description="Scores ChatGPT, Claude, and Gemini against the task and returns a ranked recommendation.",
)
async def route_task(request: RouteRequest) -> RouteResponse:
    try:
        result = _svc.suggest_tool(request.task, request.steps)
        return RouteResponse(**result)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Routing failed: {exc}") from exc
