"""
AI Command Center — FastAPI application entry point.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routers import plan, route, prompt, memory, feedback


# ---------------------------------------------------------------------------
# Lifespan (startup / shutdown hooks)
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("✅  AI Command Center API starting up")
    yield
    # Shutdown
    print("🛑  AI Command Center API shutting down")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="AI Command Center API",
    description=(
        "A modular FastAPI backend that plans tasks, routes them to the best AI tool, "
        "generates optimised prompts, and stores history."
    ),
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)


# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Global exception handler — returns JSON instead of HTML for 500s
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {exc}"},
    )


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(plan.router,     prefix="/plan",     tags=["Plan"])
app.include_router(route.router,    prefix="/route",    tags=["Route"])
app.include_router(prompt.router,   prefix="/prompt",   tags=["Prompt"])
app.include_router(memory.router,   prefix="/memory",   tags=["Memory"])
app.include_router(feedback.router, prefix="/feedback", tags=["Feedback"])


# ---------------------------------------------------------------------------
# Root + health
# ---------------------------------------------------------------------------
@app.get("/", tags=["Health"], summary="Root")
def root():
    return {"message": "AI Command Center API is running", "version": "2.0.0"}


@app.get("/health", tags=["Health"], summary="Health check")
def health():
    return {"status": "ok"}
