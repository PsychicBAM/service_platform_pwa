import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import require_active_user
from app.models.user import User
from app.repositories.order_repository import UserOrderStatusFilter
from app.schemas.order import (
    ClientOrderCancelRequest,
    MyOrderDetail,
    MyOrderListResponse,
)
from app.services.client_order_service import ClientOrderService

router = APIRouter(prefix="/me", tags=["me-orders"])


@router.get("/orders", response_model=MyOrderListResponse)
async def list_my_orders(
    status: UserOrderStatusFilter | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> MyOrderListResponse:
    return await ClientOrderService(db).list_my_orders(
        current_user,
        status_filter=status,
        page=page,
        limit=limit,
    )


@router.get("/orders/{order_id}", response_model=MyOrderDetail)
async def get_my_order(
    order_id: uuid.UUID,
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> MyOrderDetail:
    return await ClientOrderService(db).get_my_order(current_user, order_id)


@router.post("/orders/{order_id}/cancel", response_model=MyOrderDetail)
async def cancel_my_order(
    order_id: uuid.UUID,
    payload: ClientOrderCancelRequest,
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> MyOrderDetail:
    return await ClientOrderService(db).cancel_my_order(
        current_user,
        order_id,
        reason=payload.reason,
    )
