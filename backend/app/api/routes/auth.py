from fastapi import APIRouter, Depends, status
from app.schemas.user import (
    UserRegisterRequest,
    UserLoginRequest,
    UserUpdateRequest,
    UserResponse,
    AuthResponse,
)
from app.services.auth_service import auth_service
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new operator account",
)
def register(payload: UserRegisterRequest):
    return auth_service.register(payload)


@router.post(
    "/login",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate and receive JWT token",
)
def login(payload: UserLoginRequest):
    return auth_service.login(payload)


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get profile of authenticated user",
)
def get_profile(current_user: dict = Depends(get_current_user)):
    return auth_service.get_current_user_profile(current_user["id"])


@router.put(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Update profile of authenticated user",
)
def update_profile(
    payload: UserUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    return auth_service.update_profile(current_user["id"], payload)


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Log out operator session",
)
def logout(current_user: dict = Depends(get_current_user)):
    return {"success": True, "message": "Logged out successfully."}
