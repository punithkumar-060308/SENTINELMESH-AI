from app.api.routes.health import router as health_router
from app.api.routes.incidents import router as incidents_router
from app.api.routes.patches import router as patches_router
from app.api.routes.agents import router as agents_router
from app.api.routes.verification import router as verification_router
from app.api.routes.audit import router as audit_router
from app.api.routes.auth import router as auth_router

__all__ = [
    "health_router",
    "incidents_router",
    "patches_router",
    "agents_router",
    "verification_router",
    "audit_router",
    "auth_router",
]
