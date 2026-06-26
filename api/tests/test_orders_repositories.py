import re
from datetime import UTC, datetime

import pytest
import pytest_asyncio
from sqlalchemy import text

from app.models.business import Business
from app.models.client import Client
from app.models.enums import (
    BusinessStatus,
    ClientSource,
    OperatingMode,
    OrderMessageSenderType,
    OrderStatus,
    PriceType,
    ServiceType,
)
from app.models.order import Order
from app.models.order_message import OrderMessage
from app.models.service import Service
from app.repositories.order_message_repository import OrderMessageRepository
from app.repositories.order_repository import OrderRepository
from app.utils.references import generate_order_reference


@pytest_asyncio.fixture(autouse=True)
async def _cleanup_order_tables(db_session):
    yield
    await db_session.execute(text("DELETE FROM order_messages"))
    await db_session.execute(text("DELETE FROM orders"))
    await db_session.execute(text("DELETE FROM clients"))
    await db_session.execute(text("DELETE FROM services"))
    await db_session.execute(text("DELETE FROM businesses"))
    await db_session.commit()


async def _create_order_context(db_session, suffix: str) -> dict:
    business = Business(
        name=f"Order Biz {suffix}",
        slug=f"order-biz-{suffix}",
        operating_mode=OperatingMode.orders_only,
        status=BusinessStatus.active,
    )
    db_session.add(business)
    await db_session.flush()

    service = Service(
        business_id=business.id,
        name="Logo Design",
        type=ServiceType.order,
        price_cents=15000,
        price_type=PriceType.fixed,
    )
    client = Client(
        business_id=business.id,
        full_name="Order Client",
        email=f"order-client-{suffix}@example.com",
        source=ClientSource.guest,
    )
    db_session.add_all([service, client])
    await db_session.flush()

    return {
        "business_id": business.id,
        "service_id": service.id,
        "client_id": client.id,
    }


@pytest.mark.asyncio
async def test_order_repository_create_and_get(db_session) -> None:
    ctx = await _create_order_context(db_session, "create-get")
    repo = OrderRepository(db_session)
    order = Order(
        business_id=ctx["business_id"],
        service_id=ctx["service_id"],
        client_id=ctx["client_id"],
        reference="ORD-2026-0001",
        status=OrderStatus.submitted,
        form_data={"brief": "Need a logo"},
    )
    await repo.create(order)
    await db_session.commit()

    loaded = await repo.get_by_id(order.id)
    assert loaded is not None
    assert loaded.reference == "ORD-2026-0001"
    assert loaded.form_data == {"brief": "Need a logo"}


@pytest.mark.asyncio
async def test_order_repository_list_for_business_isolated(db_session) -> None:
    ctx_a = await _create_order_context(db_session, "biz-a")
    ctx_b = await _create_order_context(db_session, "biz-b")
    repo = OrderRepository(db_session)

    order_a = Order(
        business_id=ctx_a["business_id"],
        service_id=ctx_a["service_id"],
        client_id=ctx_a["client_id"],
        reference="ORD-2026-0001",
    )
    order_b = Order(
        business_id=ctx_b["business_id"],
        service_id=ctx_b["service_id"],
        client_id=ctx_b["client_id"],
        reference="ORD-2026-0002",
    )
    await repo.create(order_a)
    await repo.create(order_b)
    await db_session.commit()

    results = await repo.list_for_business(ctx_a["business_id"])
    assert len(results) == 1
    assert results[0].id == order_a.id


@pytest.mark.asyncio
async def test_order_repository_status_filter(db_session) -> None:
    ctx = await _create_order_context(db_session, "status-filter")
    repo = OrderRepository(db_session)

    submitted = Order(
        business_id=ctx["business_id"],
        service_id=ctx["service_id"],
        client_id=ctx["client_id"],
        reference="ORD-2026-0001",
        status=OrderStatus.submitted,
    )
    accepted = Order(
        business_id=ctx["business_id"],
        service_id=ctx["service_id"],
        client_id=ctx["client_id"],
        reference="ORD-2026-0002",
        status=OrderStatus.accepted,
    )
    await repo.create(submitted)
    await repo.create(accepted)
    await db_session.commit()

    accepted_only = await repo.list_for_business(
        ctx["business_id"],
        status=OrderStatus.accepted,
    )
    assert len(accepted_only) == 1
    assert accepted_only[0].status == OrderStatus.accepted
    assert await repo.count_for_business(
        ctx["business_id"],
        status=OrderStatus.submitted,
    ) == 1


@pytest.mark.asyncio
async def test_order_message_repository_create_and_list(db_session) -> None:
    ctx = await _create_order_context(db_session, "messages")
    order_repo = OrderRepository(db_session)
    message_repo = OrderMessageRepository(db_session)

    order = Order(
        business_id=ctx["business_id"],
        service_id=ctx["service_id"],
        client_id=ctx["client_id"],
        reference="ORD-2026-0001",
    )
    await order_repo.create(order)
    await db_session.flush()

    msg = OrderMessage(
        order_id=order.id,
        business_id=ctx["business_id"],
        sender_type=OrderMessageSenderType.client,
        body="Hello, I need help with colors.",
    )
    await message_repo.create(msg)
    await db_session.commit()

    messages = await message_repo.list_for_order(order.id)
    assert len(messages) == 1
    assert messages[0].body == "Hello, I need help with colors."


@pytest.mark.asyncio
async def test_generate_order_reference_format(db_session) -> None:
    ctx = await _create_order_context(db_session, "ref")
    reference = await generate_order_reference(db_session, ctx["business_id"], 2026)
    assert re.fullmatch(r"ORD-2026-\d{4}", reference) is not None

    order = Order(
        business_id=ctx["business_id"],
        service_id=ctx["service_id"],
        client_id=ctx["client_id"],
        reference=reference,
    )
    await OrderRepository(db_session).create(order)
    await db_session.commit()

    next_reference = await generate_order_reference(db_session, ctx["business_id"], 2026)
    assert next_reference == "ORD-2026-0002"


@pytest.mark.asyncio
async def test_order_messages_preserve_created_at_ordering(db_session) -> None:
    ctx = await _create_order_context(db_session, "msg-order")
    order_repo = OrderRepository(db_session)
    message_repo = OrderMessageRepository(db_session)

    order = Order(
        business_id=ctx["business_id"],
        service_id=ctx["service_id"],
        client_id=ctx["client_id"],
        reference="ORD-2026-0001",
    )
    await order_repo.create(order)
    await db_session.flush()

    first = OrderMessage(
        order_id=order.id,
        business_id=ctx["business_id"],
        sender_type=OrderMessageSenderType.client,
        body="First message",
        created_at=datetime(2026, 6, 1, 10, 0, tzinfo=UTC),
    )
    second = OrderMessage(
        order_id=order.id,
        business_id=ctx["business_id"],
        sender_type=OrderMessageSenderType.admin,
        body="Second message",
        created_at=datetime(2026, 6, 1, 11, 0, tzinfo=UTC),
    )
    await message_repo.create(first)
    await message_repo.create(second)
    await db_session.commit()

    messages = await message_repo.list_for_order(order.id)
    assert [m.body for m in messages] == ["First message", "Second message"]
    assert messages[0].created_at < messages[1].created_at
