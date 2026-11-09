import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)
from app.schemas.user import (
    UserRegisterRequest,
    UserLoginRequest,
    UserUpdateRequest,
    UserResponse,
    AuthResponse,
)
from app.services.auth_service import AuthService
from app.repositories import user_repo


@pytest.fixture(autouse=True)
def clean_user_repo():
    user_repo.reset_for_tests()
    yield
    user_repo.reset_for_tests()


class TestPasswordSecurity:
    def test_hash_and_verify_password(self):
        password = "SecurePassword123!"
        hashed = hash_password(password)

        assert hashed != password
        assert hashed.startswith("$2b$") or hashed.startswith("$2a$")
        assert verify_password(password, hashed) is True
        assert verify_password("WrongPassword123!", hashed) is False

    def test_token_creation_and_decoding(self):
        payload = {"sub": "usr-test-123", "email": "test@sentinelmesh.ai"}
        token = create_access_token(payload)

        decoded = decode_access_token(token)
        assert decoded is not None
        assert decoded["sub"] == "usr-test-123"
        assert decoded["email"] == "test@sentinelmesh.ai"
        assert "exp" in decoded

    def test_decode_invalid_token_returns_none(self):
        assert decode_access_token("invalid.token.structure") is None

    def test_decode_tampered_token_returns_none(self):
        payload = {"sub": "usr-test-123", "email": "test@sentinelmesh.ai"}
        token = create_access_token(payload)
        # Tamper signature by modifying last few characters
        tampered_token = token[:-5] + ("AAAAA" if token[-5:] != "AAAAA" else "BBBBB")
        assert decode_access_token(tampered_token) is None

    def test_decode_expired_token_returns_none(self):
        from datetime import timedelta
        payload = {"sub": "usr-expired", "email": "expired@sentinelmesh.ai"}
        token = create_access_token(payload, expires_delta=timedelta(seconds=-30))
        assert decode_access_token(token) is None


class TestUserSchemas:
    def test_password_mismatch_raises_validation_error(self):
        with pytest.raises(ValidationError) as exc_info:
            UserRegisterRequest(
                name="Alice Operator",
                email="alice@sentinelmesh.ai",
                password="Password123!",
                confirm_password="PasswordMismatch456!",
            )
        assert "Passwords do not match" in str(exc_info.value)

    def test_password_length_validation(self):
        with pytest.raises(ValidationError):
            UserRegisterRequest(
                name="Alice Operator",
                email="alice@sentinelmesh.ai",
                password="123",
                confirm_password="123",
            )

    def test_user_response_omits_password_hash(self):
        user_dict = {
            "id": "usr-123",
            "name": "Alice Operator",
            "email": "alice@sentinelmesh.ai",
            "password_hash": "$2b$12$secretHashValueThatMustNeverLeak",
            "avatar_url": None,
            "created_at": "2026-11-09T12:00:00Z",
        }
        resp = UserResponse(**user_dict)
        dumped = resp.model_dump()
        assert "password_hash" not in dumped
        assert "password" not in dumped
        assert dumped["id"] == "usr-123"
        assert dumped["name"] == "Alice Operator"


class TestAuthService:
    def test_register_success(self):
        service = AuthService()
        payload = UserRegisterRequest(
            name="John Doe",
            email="john@sentinelmesh.ai",
            password="SecurePassword999!",
            confirm_password="SecurePassword999!",
        )

        res = service.register(payload)
        assert isinstance(res, AuthResponse)
        assert res.access_token is not None
        assert res.token_type == "bearer"
        assert res.user.email == "john@sentinelmesh.ai"
        assert res.user.name == "John Doe"
        assert not hasattr(res.user, "password_hash")

        # Verify user is persisted in repository
        persisted = user_repo.get_by_email("john@sentinelmesh.ai")
        assert persisted is not None
        assert persisted["name"] == "John Doe"
        assert verify_password("SecurePassword999!", persisted["password_hash"]) is True

    def test_register_duplicate_email_fails(self):
        service = AuthService()
        payload = UserRegisterRequest(
            name="Duplicate User",
            email="duplicate@sentinelmesh.ai",
            password="SecurePassword999!",
            confirm_password="SecurePassword999!",
        )
        service.register(payload)

        with pytest.raises(HTTPException) as exc_info:
            service.register(payload)
        assert exc_info.value.status_code == 409
        assert "already exists" in exc_info.value.detail

    def test_register_duplicate_case_insensitive_fails(self):
        service = AuthService()
        payload1 = UserRegisterRequest(
            name="User One",
            email="operator.special@sentinelmesh.ai",
            password="SecurePassword999!",
            confirm_password="SecurePassword999!",
        )
        service.register(payload1)

        payload2 = UserRegisterRequest(
            name="User Two",
            email="  OPERATOR.SPECIAL@SENTINELMESH.AI  ",
            password="SecurePassword999!",
            confirm_password="SecurePassword999!",
        )
        with pytest.raises(HTTPException) as exc_info:
            service.register(payload2)
        assert exc_info.value.status_code == 409
        assert "already exists" in exc_info.value.detail

    def test_login_success(self):
        service = AuthService()
        reg_payload = UserRegisterRequest(
            name="Login User",
            email="login@sentinelmesh.ai",
            password="MySecretPassword123!",
            confirm_password="MySecretPassword123!",
        )
        service.register(reg_payload)

        login_payload = UserLoginRequest(
            email="login@sentinelmesh.ai",
            password="MySecretPassword123!",
        )
        auth_resp = service.login(login_payload)
        assert auth_resp.access_token is not None
        assert auth_resp.user.email == "login@sentinelmesh.ai"
        assert auth_resp.user.name == "Login User"

    def test_login_wrong_password_fails(self):
        service = AuthService()
        reg_payload = UserRegisterRequest(
            name="Wrong Pass User",
            email="wrongpass@sentinelmesh.ai",
            password="MySecretPassword123!",
            confirm_password="MySecretPassword123!",
        )
        service.register(reg_payload)

        login_payload = UserLoginRequest(
            email="wrongpass@sentinelmesh.ai",
            password="IncorrectPassword!",
        )
        with pytest.raises(HTTPException) as exc_info:
            service.login(login_payload)
        assert exc_info.value.status_code == 401
        assert "Invalid email or password" in exc_info.value.detail

    def test_login_nonexistent_user_fails(self):
        service = AuthService()
        login_payload = UserLoginRequest(
            email="nonexistent@sentinelmesh.ai",
            password="RandomPassword123!",
        )
        with pytest.raises(HTTPException) as exc_info:
            service.login(login_payload)
        assert exc_info.value.status_code == 401

    def test_get_profile(self):
        service = AuthService()
        reg_payload = UserRegisterRequest(
            name="Profile User",
            email="profile@sentinelmesh.ai",
            password="MySecretPassword123!",
            confirm_password="MySecretPassword123!",
        )
        reg_res = service.register(reg_payload)
        user_id = reg_res.user.id

        profile = service.get_current_user_profile(user_id)
        assert profile.id == user_id
        assert profile.name == "Profile User"
        assert profile.email == "profile@sentinelmesh.ai"

    def test_update_profile(self):
        service = AuthService()
        reg_payload = UserRegisterRequest(
            name="Update User",
            email="update@sentinelmesh.ai",
            password="MySecretPassword123!",
            confirm_password="MySecretPassword123!",
        )
        reg_res = service.register(reg_payload)
        user_id = reg_res.user.id

        update_payload = UserUpdateRequest(
            name="Updated Name",
            avatar_url="https://sentinelmesh.ai/avatar.png",
        )
        updated = service.update_profile(user_id, update_payload)
        assert updated.name == "Updated Name"
        assert updated.avatar_url == "https://sentinelmesh.ai/avatar.png"

        # Verify update persisted
        fetched = service.get_current_user_profile(user_id)
        assert fetched.name == "Updated Name"
        assert fetched.avatar_url == "https://sentinelmesh.ai/avatar.png"


class TestAuthDependency:
    def test_get_current_user_no_credentials_fails(self):
        from app.dependencies.auth import get_current_user
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(None)
        assert exc_info.value.status_code == 401
        assert "Authentication required" in exc_info.value.detail

    def test_get_current_user_invalid_token_fails(self):
        from app.dependencies.auth import get_current_user
        from fastapi.security import HTTPAuthorizationCredentials
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="invalid.token.here")
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(creds)
        assert exc_info.value.status_code == 401
        assert "Invalid or expired access token" in exc_info.value.detail

    def test_get_current_user_valid_token_success(self):
        from app.dependencies.auth import get_current_user
        from fastapi.security import HTTPAuthorizationCredentials
        new_user = user_repo.create({
            "name": "Dependency User",
            "email": "dep@sentinelmesh.ai",
            "password_hash": "hash",
        })
        token = create_access_token({"sub": new_user["id"], "email": new_user["email"]})
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        user = get_current_user(creds)
        assert user["id"] == new_user["id"]
        assert user["email"] == "dep@sentinelmesh.ai"

    def test_require_authenticated_operator_production_enforcement(self, monkeypatch):
        from app.dependencies.auth import require_authenticated_operator
        from app.core.config import settings

        monkeypatch.setattr(settings, "TESTING", False)
        monkeypatch.setattr(settings, "ENVIRONMENT", "production")

        # Unauthenticated request in production must fail with 401
        with pytest.raises(HTTPException) as exc_info:
            require_authenticated_operator(None)
        assert exc_info.value.status_code == 401
        assert "Authentication required" in exc_info.value.detail

    def test_require_authenticated_operator_invalid_token_enforcement(self):
        from app.dependencies.auth import require_authenticated_operator
        from fastapi.security import HTTPAuthorizationCredentials

        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="invalid.token.here")
        with pytest.raises(HTTPException) as exc_info:
            require_authenticated_operator(creds)
        assert exc_info.value.status_code == 401
        assert "Invalid or expired access token" in exc_info.value.detail

