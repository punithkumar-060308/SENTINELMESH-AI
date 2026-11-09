import pytest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.core.config import Settings, INSECURE_DEFAULT_JWT_SECRET, settings
from app.core.security import create_access_token
from app.db.mongodb import MongoDBManager
from app.repositories import user_repo
from app.services.auth_service import AuthService
from app.schemas.user import UserRegisterRequest, UserLoginRequest
from app.main import app


def test_production_jwt_secret_insecure_fallback_rejected():
    """In production, using the insecure default secret must be rejected during settings validation."""
    with pytest.raises(ValueError, match="JWT_SECRET_KEY must be configured in environment variables"):
        Settings(
            ENVIRONMENT="production",
            JWT_SECRET_KEY=INSECURE_DEFAULT_JWT_SECRET,
            CORS_ORIGINS=["https://sentinelmesh.vercel.app"],
        )


def test_production_jwt_runtime_validation():
    """In production, create_access_token must raise RuntimeError if an insecure fallback secret is used."""
    with patch.object(settings, "ENVIRONMENT", "production"), patch.object(settings, "JWT_SECRET_KEY", INSECURE_DEFAULT_JWT_SECRET):
        with pytest.raises(RuntimeError, match="CRITICAL SECURITY FAULT"):
            create_access_token({"sub": "test"})


def test_production_cors_wildcard_rejected():
    """In production, wildcard '*' CORS origin must be rejected or stripped."""
    with pytest.raises(ValueError, match="CORS_ORIGINS must specify the exact deployed frontend origin"):
        Settings(
            ENVIRONMENT="production",
            JWT_SECRET_KEY="super_secure_production_secret_key_12345",
            CORS_ORIGINS=["*"],
        )


def test_mongodb_production_startup_failure():
    """In production, if MongoDB Atlas connection fails, db_manager.connect() must raise RuntimeError (fail startup)."""
    mgr = MongoDBManager()
    with patch("app.db.mongodb.settings") as mock_settings:
        mock_settings.TESTING = False
        mock_settings.ENVIRONMENT = "production"
        mock_settings.MONGODB_URI = "mongodb://invalid-host:27017"
        mock_settings.DATABASE_NAME = "sentinelmesh_db"

        with patch("app.db.mongodb.MongoClient") as mock_client:
            mock_client.side_effect = Exception("Connection refused to Atlas")
            with pytest.raises(RuntimeError, match="Production environment requires an active MongoDB Atlas connection"):
                mgr.connect()


def test_mongodb_development_fallback_permitted():
    """In development, if MongoDB fails, db_manager.connect() logs warning and returns False (in-memory allowed)."""
    mgr = MongoDBManager()
    with patch("app.db.mongodb.settings") as mock_settings:
        mock_settings.TESTING = False
        mock_settings.ENVIRONMENT = "development"
        mock_settings.MONGODB_URI = "mongodb://invalid-host:27017"
        mock_settings.DATABASE_NAME = "sentinelmesh_db"

        with patch("app.db.mongodb.MongoClient") as mock_client:
            mock_client.side_effect = Exception("Connection refused to local mongo")
            result = mgr.connect()
            assert result is False
            assert mgr.is_connected is False


def test_health_check_distinguishes_db_and_api():
    """Health check must clearly separate API availability from database status."""
    client = TestClient(app)

    # 1. In development with DB disconnected -> 200 degraded with in_memory_fallback
    with patch("app.api.routes.health.settings") as mock_settings:
        mock_settings.ENVIRONMENT = "development"
        mock_settings.PROJECT_NAME = "SentinelMesh AI"
        mock_settings.VERSION = "1.0.0"

        with patch("app.api.routes.health.db_manager") as mock_db:
            mock_db.is_connected = False
            res = client.get("/health")
            assert res.status_code == 200
            data = res.json()
            assert data["api"] == "available"
            assert data["status"] == "ok"
            assert data["database"]["status"] == "in_memory_fallback"

    # 2. In production with DB disconnected -> 503 unhealthy with disconnected status
    with patch("app.api.routes.health.settings") as mock_settings:
        mock_settings.ENVIRONMENT = "production"
        mock_settings.PROJECT_NAME = "SentinelMesh AI"
        mock_settings.VERSION = "1.0.0"

        with patch("app.api.routes.health.db_manager") as mock_db:
            mock_db.is_connected = False
            res = client.get("/health")
            assert res.status_code == 503
            data = res.json()
            assert data["api"] == "available"
            assert data["status"] == "unhealthy"
            assert data["database"]["status"] == "disconnected"


def test_user_auth_in_memory_disallowed_in_production():
    """User registration and login cannot silently operate against in-memory storage in production."""
    auth = AuthService()

    with patch.object(settings, "ENVIRONMENT", "production"), patch("app.repositories.base.db_manager.is_connected", False):
        # Registration must fail with 503 Service Unavailable
        with pytest.raises(HTTPException) as exc_reg:
            auth.register(UserRegisterRequest(
                name="Production Operator",
                email="prod.operator@sentinelmesh.ai",
                password="SecurePassword@2026",
                confirm_password="SecurePassword@2026",
            ))
        assert exc_reg.value.status_code == 503
        assert "Database persistence unavailable" in exc_reg.value.detail

        # Login must fail with 503 Service Unavailable
        with pytest.raises(HTTPException) as exc_login:
            auth.login(UserLoginRequest(
                email="prod.operator@sentinelmesh.ai",
                password="SecurePassword@2026",
            ))
        assert exc_login.value.status_code == 503
        assert "Database persistence unavailable" in exc_login.value.detail
