import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.business import get_business_for_admin_or_403
from app.models.business import Business
from app.schemas.business import BusinessAdminRead, BusinessUpdate
from app.services.business_service import BusinessService

router = APIRouter(prefix="/businesses", tags=["businesses"])


@router.get("/{business_id}", response_model=BusinessAdminRead)
async def get_business_profile(
    business_id: uuid.UUID,
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> BusinessAdminRead:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    return await BusinessService(db).get_admin_business(business)


@router.patch("/{business_id}", response_model=BusinessAdminRead)
async def update_business_profile(
    business_id: uuid.UUID,
    payload: BusinessUpdate,
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> BusinessAdminRead:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    return await BusinessService(db).update_admin_business(business, payload)
