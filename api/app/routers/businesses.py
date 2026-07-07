import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.business import get_business_for_admin_or_403
from app.models.business import Business
from app.models.enums import ConsentEntityType, ConsentSource
from app.schemas.business import BusinessAdminRead, BusinessUpdate
from app.schemas.legal_consent_records import LegalConsentRecordListResponse
from app.schemas.mini_site import MiniSiteConfig, MiniSiteConfigWrite
from app.services.business_service import BusinessService
from app.services.legal_consent_service import LegalConsentService

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


@router.get("/{business_id}/mini-site-config", response_model=MiniSiteConfig)
async def get_mini_site_config(
    business_id: uuid.UUID,
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> MiniSiteConfig:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    return await BusinessService(db).get_mini_site_config(business)


@router.put("/{business_id}/mini-site-config", response_model=MiniSiteConfig)
async def save_mini_site_config(
    business_id: uuid.UUID,
    payload: MiniSiteConfigWrite,
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> MiniSiteConfig:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    return await BusinessService(db).save_mini_site_config(business, payload)


@router.get("/{business_id}/legal-consents", response_model=LegalConsentRecordListResponse)
async def list_legal_consents(
    business_id: uuid.UUID,
    source: ConsentSource | None = Query(default=None),
    entity_type: ConsentEntityType | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=25, ge=1, le=100),
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> LegalConsentRecordListResponse:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    return await LegalConsentService(db).list_consent_records_for_business(
        business_id=business.id,
        source=source,
        entity_type=entity_type,
        page=page,
        limit=limit,
    )
