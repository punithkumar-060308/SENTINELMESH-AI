from typing import Optional, Dict, Any
from fastapi import HTTPException, status
from app.repositories import user_repo
from app.core.security import hash_password, verify_password, create_access_token
from app.schemas.user import (
    UserRegisterRequest,
    UserLoginRequest,
    UserUpdateRequest,
    UserResponse,
    AuthResponse,
)


def _handle_storage_error(e: Exception):
    if isinstance(e, RuntimeError) and "disabled in production" in str(e):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database persistence unavailable. In-memory authentication storage is disabled in production.",
        )
    raise e


class AuthService:
    def __init__(self):
        self.user_repo = user_repo

    def register(self, payload: UserRegisterRequest) -> AuthResponse:
        norm_email = payload.email.strip().lower()
        try:
            existing = self.user_repo.get_by_email(norm_email)
        except Exception as e:
            _handle_storage_error(e)

        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An account with email '{norm_email}' already exists.",
            )

        hashed_pw = hash_password(payload.password)
        try:
            new_user = self.user_repo.create({
                "name": payload.name.strip(),
                "email": norm_email,
                "password_hash": hashed_pw,
                "avatar_url": None,
            })
        except Exception as e:
            _handle_storage_error(e)

        token = create_access_token({"sub": new_user["id"], "email": new_user["email"]})
        user_resp = UserResponse(
            id=new_user["id"],
            name=new_user["name"],
            email=new_user["email"],
            avatar_url=new_user.get("avatar_url"),
            created_at=new_user["created_at"],
            updated_at=new_user.get("updated_at"),
        )
        return AuthResponse(access_token=token, token_type="bearer", user=user_resp)

    def login(self, payload: UserLoginRequest) -> AuthResponse:
        norm_email = payload.email.strip().lower()
        try:
            user = self.user_repo.get_by_email(norm_email)
        except Exception as e:
            _handle_storage_error(e)

        if not user or not verify_password(payload.password, user.get("password_hash", "")):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        token = create_access_token({"sub": user["id"], "email": user["email"]})
        user_resp = UserResponse(
            id=user["id"],
            name=user["name"],
            email=user["email"],
            avatar_url=user.get("avatar_url"),
            created_at=user["created_at"],
            updated_at=user.get("updated_at"),
        )
        return AuthResponse(access_token=token, token_type="bearer", user=user_resp)

    def get_current_user_profile(self, user_id: str) -> UserResponse:
        try:
            user = self.user_repo.get_by_id(user_id)
        except Exception as e:
            _handle_storage_error(e)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User account not found.",
            )
        return UserResponse(
            id=user["id"],
            name=user["name"],
            email=user["email"],
            avatar_url=user.get("avatar_url"),
            created_at=user["created_at"],
            updated_at=user.get("updated_at"),
        )

    def update_profile(self, user_id: str, payload: UserUpdateRequest) -> UserResponse:
        updates = {}
        if payload.name is not None:
            updates["name"] = payload.name.strip()
        if payload.avatar_url is not None:
            updates["avatar_url"] = payload.avatar_url.strip()

        try:
            updated = self.user_repo.update(user_id, updates)
        except Exception as e:
            _handle_storage_error(e)

        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User account not found.",
            )
        return UserResponse(
            id=updated["id"],
            name=updated["name"],
            email=updated["email"],
            avatar_url=updated.get("avatar_url"),
            created_at=updated["created_at"],
            updated_at=updated.get("updated_at"),
        )


auth_service = AuthService()
