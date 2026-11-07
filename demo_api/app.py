"""FastAPI Demo Application for SentinelMesh AI Testing and Verification.
Implements Section 1 of 08_TESTING_AND_VERIFICATION.md:
- Reproducible bug in GET /users resulting in HTTP 500 when connection pool exhausted.
- Regression tests verify 500 on unpatched, and 200 on patched.
"""

from fastapi import FastAPI, HTTPException, status
import demo_api.service as demo_service

demo_app = FastAPI(title="SentinelMesh Demo User Service")


@demo_app.get("/health")
def health():
    return {"status": "ok", "service": "demo-user-api"}


@demo_app.get("/users")
def list_users(pool_timeout: float = 0.05, max_connections: int = 10, current_connections: int = 10):
    try:
        users = demo_service.get_users(
            pool_timeout=pool_timeout,
            max_connections=max_connections,
            current_connections=current_connections,
        )
        return {"users": users, "count": len(users)}
    except TimeoutError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        )
