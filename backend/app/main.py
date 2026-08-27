from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Feature Routers
from app.modules.users.router import auth_router, users_router
from app.modules.projects.router import projects_router
from app.modules.requests.router import requests_router
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(projects_router)
app.include_router(requests_router)


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
        "status": "healthy"
    }
