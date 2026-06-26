from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import require_active_user
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    MeResponse,
    RefreshRequest,
    RefreshResponse,
    RegisterBusinessRequest,
    RegisterBusinessResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


def get_auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    return AuthService(db)


@router.post("/register", response_model=RegisterBusinessResponse, status_code=201)
async def register_business_owner(
    payload: RegisterBusinessRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> RegisterBusinessResponse:
    return await auth_service.register_business_owner(payload)


@router.post("/login", response_model=LoginResponse)
async def login(
    payload: LoginRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> LoginResponse:
    user, tokens = await auth_service.login(payload)
    return LoginResponse(user=user, tokens=tokens)


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_token(
    payload: RefreshRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> RefreshResponse:
    return await auth_service.refresh_access_token(payload.refresh_token)


@router.get("/me", response_model=MeResponse)
async def get_me(
    current_user: User = Depends(require_active_user),
    auth_service: AuthService = Depends(get_auth_service),
) -> MeResponse:
    return await auth_service.get_me(current_user.id)
