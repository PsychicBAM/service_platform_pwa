import uuid

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.business import Business
from app.models.enums import BusinessStatus
from app.models.user import User
from app.repositories.business_repository import BusinessRepository
from app.services.service_service import BusinessAccessService

# TODO: refine staff permissions when role capabilities are defined.


async def get_business_for_admin_or_403(
    business_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Business:
    return await BusinessAccessService(db).get_business_for_admin_or_403(
        business_id,
        current_user,
    )


async def get_active_business_by_slug(
    slug: str,
    db: AsyncSession = Depends(get_db),
) -> Business:
    from app.exceptions.business import NotFoundError

    business = await BusinessRepository(db).get_by_slug(slug)
    if business is None or business.status != BusinessStatus.active:
        raise NotFoundError("Business not found.")
    return business
