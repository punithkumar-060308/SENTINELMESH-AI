import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.db.mongodb import db_manager
from app.api.routes import (
    health_router,
    incidents_router,
    patches_router,
    agents_router,
    verification_router,
    audit_router,
    auth_router,
)

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("sentinelmesh.app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to MongoDB (with graceful in-memory fallback if unavailable)
    logger.info("Initializing SentinelMesh AI API...")
    if not (settings.TESTING or settings.ENVIRONMENT == "testing"):
        import asyncio
        await asyncio.to_thread(db_manager.connect)
    yield
    # Shutdown: Disconnect DB client
    logger.info("Shutting down SentinelMesh AI API...")
    if db_manager.is_connected:
        db_manager.disconnect()


app = FastAPI(
    title="SentinelMesh AI API",
    version=settings.VERSION,
    description=(
        "SentinelMesh AI Multi-Agent Incident Detection, Investigation, Repair, "
        "and Sandbox Verification Platform API"
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Configure CORS
cors_origins = settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else [settings.CORS_ORIGINS]
if (settings.ENVIRONMENT or "").strip().lower() == "production":
    # Strictly filter out wildcard '*' and local development hosts in production
    cors_origins = [
        o for o in cors_origins
        if o != "*" and not o.startswith("http://localhost") and not o.startswith("http://127.0.0.1")
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

# Custom error formatters for consistent response shapes
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "status_code": exc.status_code,
            "message": exc.detail,
            "detail": exc.detail,
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "error": True,
            "status_code": 422,
            "message": "Validation Error",
            "details": exc.errors(),
        },
    )


# Mount routers
app.include_router(health_router)
app.include_router(incidents_router)
app.include_router(patches_router)
app.include_router(agents_router)
app.include_router(verification_router)
app.include_router(audit_router)
app.include_router(auth_router)

# Mount canonical demo service under /demo for unified hackathon evaluation
try:
    from demo_api.app import demo_app
    app.mount("/demo", demo_app)
    logger.info("Canonical demo service mounted under /demo")
except Exception as e:
    logger.warning("Could not mount demo_api sub-application: %s", e)


@app.get("/", tags=["Root"])
def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs_url": "/docs",
        "health_check": "/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
