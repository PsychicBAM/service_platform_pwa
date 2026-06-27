import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.business import get_business_for_admin_or_403
from app.models.business import Business
from app.schemas.client import ClientDetail, ClientListResponse, ClientUpdate
from app.services.admin_client_service import AdminClientService

router = APIRouter(prefix="/businesses", tags=["clients"])


@router.get("/{business_id}/clients", response_model=ClientListResponse)
async def list_clients(
    business_id: uuid.UUID,
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> ClientListResponse:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    return await AdminClientService(db).list_admin_clients(
        business,
        search=search,
        page=page,
        limit=limit,
    )


@router.get("/{business_id}/clients/{client_id}", response_model=ClientDetail)
async def get_client(
    business_id: uuid.UUID,
    client_id: uuid.UUID,
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> ClientDetail:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    return await AdminClientService(db).get_admin_client(business, client_id)


@router.patch("/{business_id}/clients/{client_id}", response_model=ClientDetail)
async def update_client(
    business_id: uuid.UUID,
    client_id: uuid.UUID,
    payload: ClientUpdate,
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> ClientDetail:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    return await AdminClientService(db).update_admin_client(
        business,
        client_id,
        payload,
    )
