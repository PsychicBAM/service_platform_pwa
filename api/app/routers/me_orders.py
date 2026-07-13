import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import require_active_user
from app.models.user import User
from app.repositories.order_repository import UserOrderStatusFilter
from app.schemas.order import (
    ClientOrderCancelRequest,
    MyOrderDetail,
    MyOrderListResponse,
    OrderMessageCreate,
    OrderMessageListResponse,
    OrderMessageRead,
)
from app.schemas.review import ClientReviewCreate, ReviewRead
from app.services.client_order_service import ClientOrderService
from app.services.order_message_service import OrderMessageService
from app.services.review_service import ReviewService

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


@router.get("/orders/{order_id}/messages", response_model=OrderMessageListResponse)
async def list_my_order_messages(
    order_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> OrderMessageListResponse:
    return await OrderMessageService(db).list_order_messages_for_user(
        current_user.id,
        order_id,
        page=page,
        limit=limit,
    )


@router.post(
    "/orders/{order_id}/messages",
    response_model=OrderMessageRead,
    status_code=201,
)
async def send_my_order_message(
    order_id: uuid.UUID,
    payload: OrderMessageCreate,
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> OrderMessageRead:
    return await OrderMessageService(db).send_order_message_as_client(
        current_user.id,
        order_id,
        payload.body,
    )


@router.post(
    "/orders/{order_id}/review",
    response_model=ReviewRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_my_order_review(
    order_id: uuid.UUID,
    payload: ClientReviewCreate,
    current_user: User = Depends(require_active_user),
    db: AsyncSession = Depends(get_db),
) -> ReviewRead:
    return await ReviewService(db).create_user_order_review(
        current_user,
        order_id,
        payload,
    )
