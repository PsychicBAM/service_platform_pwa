import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.business import get_business_for_admin_or_403
from app.models.business import Business
from app.models.enums import OrderStatus
from app.models.user import User
from app.schemas.order import (
    AdminOrderAcceptRequest,
    AdminOrderCancelRequest,
    AdminOrderDeclineRequest,
    AdminOrderListResponse,
    AdminOrderRead,
    AdminOrderUpdate,
    OrderMessageCreate,
    OrderMessageListResponse,
    OrderMessageRead,
)
from app.services.admin_order_service import AdminOrderService
from app.services.order_message_service import OrderMessageService

router = APIRouter(prefix="/businesses", tags=["orders"])


@router.get("/{business_id}/orders", response_model=AdminOrderListResponse)
async def list_orders(
    business_id: uuid.UUID,
    status: OrderStatus | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> AdminOrderListResponse:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    return await AdminOrderService(db).list_admin_orders(
        business,
        status=status,
        search=search,
        page=page,
        limit=limit,
    )


@router.get("/{business_id}/orders/{order_id}", response_model=AdminOrderRead)
async def get_order(
    business_id: uuid.UUID,
    order_id: uuid.UUID,
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> AdminOrderRead:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    return await AdminOrderService(db).get_admin_order(business, order_id)


@router.patch("/{business_id}/orders/{order_id}", response_model=AdminOrderRead)
async def update_order(
    business_id: uuid.UUID,
    order_id: uuid.UUID,
    payload: AdminOrderUpdate,
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> AdminOrderRead:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    return await AdminOrderService(db).update_admin_order(
        business,
        order_id,
        payload,
    )


@router.post("/{business_id}/orders/{order_id}/accept", response_model=AdminOrderRead)
async def accept_order(
    business_id: uuid.UUID,
    order_id: uuid.UUID,
    payload: AdminOrderAcceptRequest,
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> AdminOrderRead:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    return await AdminOrderService(db).accept_admin_order(
        business,
        order_id,
        payload,
    )


@router.post("/{business_id}/orders/{order_id}/decline", response_model=AdminOrderRead)
async def decline_order(
    business_id: uuid.UUID,
    order_id: uuid.UUID,
    payload: AdminOrderDeclineRequest,
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> AdminOrderRead:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    return await AdminOrderService(db).decline_admin_order(
        business,
        order_id,
        payload,
    )


@router.post("/{business_id}/orders/{order_id}/in-progress", response_model=AdminOrderRead)
async def mark_order_in_progress(
    business_id: uuid.UUID,
    order_id: uuid.UUID,
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> AdminOrderRead:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    return await AdminOrderService(db).mark_order_in_progress(business, order_id)


@router.post("/{business_id}/orders/{order_id}/complete", response_model=AdminOrderRead)
async def complete_order(
    business_id: uuid.UUID,
    order_id: uuid.UUID,
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> AdminOrderRead:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    return await AdminOrderService(db).complete_admin_order(business, order_id)


@router.post("/{business_id}/orders/{order_id}/cancel", response_model=AdminOrderRead)
async def cancel_order(
    business_id: uuid.UUID,
    order_id: uuid.UUID,
    payload: AdminOrderCancelRequest,
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> AdminOrderRead:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    return await AdminOrderService(db).cancel_admin_order(
        business,
        order_id,
        reason=payload.reason,
    )


@router.get(
    "/{business_id}/orders/{order_id}/messages",
    response_model=OrderMessageListResponse,
)
async def list_order_messages(
    business_id: uuid.UUID,
    order_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    business: Business = Depends(get_business_for_admin_or_403),
    db: AsyncSession = Depends(get_db),
) -> OrderMessageListResponse:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    return await OrderMessageService(db).list_order_messages_for_admin(
        business.id,
        order_id,
        page=page,
        limit=limit,
    )


@router.post(
    "/{business_id}/orders/{order_id}/messages",
    response_model=OrderMessageRead,
    status_code=201,
)
async def send_order_message(
    business_id: uuid.UUID,
    order_id: uuid.UUID,
    payload: OrderMessageCreate,
    business: Business = Depends(get_business_for_admin_or_403),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OrderMessageRead:
    if business.id != business_id:
        raise ValueError("business mismatch")  # pragma: no cover
    return await OrderMessageService(db).send_order_message_as_admin(
        business,
        current_user.id,
        order_id,
        payload.body,
    )
