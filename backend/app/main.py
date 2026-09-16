import logging
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings

logger = logging.getLogger("aerostake.main")
settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    docs_url="/docs",
    redoc_url="/redoc",
)

# 1. Global CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 2. Global Exception Handlers for Unified JSON Error Format
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Unified handler for standard HTTP errors."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "message": exc.detail,
            "details": [],
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Unified handler for Pydantic schema validation failures."""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={
            "status": "error",
            "message": "Request validation failed",
            "details": exc.errors(),
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Catch-all handler for unexpected server exceptions."""
    logger.exception(f"Unhandled Exception on {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "status": "error",
            "message": "An internal server error occurred",
            "details": [str(exc)] if settings.DEBUG else [],
        },
    )


# 3. Feature Routers
from app.modules.users.router import auth_router, users_router
from app.modules.invitations.router import invitations_router
from app.modules.organizations.router import organizations_router
from app.modules.projects.router import projects_router
from app.modules.requests.router import global_requests_router, requests_router
from app.modules.planning.router import planning_router
from app.modules.sectors.router import sectors_router
from app.modules.allocations.router import allocations_router
from app.modules.payments.router import payments_router
from app.modules.timeline.router import timeline_router

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(invitations_router)
app.include_router(organizations_router)
app.include_router(projects_router)
app.include_router(global_requests_router)
app.include_router(requests_router)
app.include_router(planning_router)
app.include_router(sectors_router)
app.include_router(allocations_router)
app.include_router(payments_router)
app.include_router(timeline_router)


# 4. System Health & Metadata
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint to verify backend service status."""
    return {"status": "ok"}


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint returning API metadata."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "status": "healthy",
    }
