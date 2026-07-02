#!/usr/bin/env python3
"""Idempotent demo data seed for local development."""

from __future__ import annotations

import asyncio
import os
import sys
from datetime import UTC, datetime, time, timedelta
from pathlib import Path

api_dir = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(api_dir))

# Scripts must not echo SQL bind parameters (password_hash, tokens, etc.).
os.environ["SQLALCHEMY_ECHO"] = "false"

from sqlalchemy import select

from app.database import async_session_factory, engine
from app.models.booking import Booking
from app.models.client import Client
from app.models.enums import (
    BookingStatus,
    BusinessMemberRole,
    BusinessStatus,
    ClientSource,
    OperatingMode,
    OrderMessageSenderType,
    OrderStatus,
    PriceType,
    ServiceType,
    SubscriptionPlan,
    SubscriptionStatus,
    UserRole,
)
from app.models.order import Order
from app.models.order_message import OrderMessage
from app.models.service import Service
from app.models.working_break import WorkingBreak
from app.repositories.business_repository import BusinessRepository
from app.repositories.client_repository import ClientRepository
from app.repositories.schedule_repository import ScheduleRepository
from app.repositories.user_repository import UserRepository
from app.services.password_service import hash_password, verify_password
from app.utils.references import generate_booking_reference, generate_order_reference

DEMO_PASSWORD = "ChangeMe123!"
SUPERADMIN_EMAIL = "superadmin@example.com"
OWNER_EMAIL = "owner@example.com"
BUSINESS_SLUG = "demo-business"
CLIENT_EMAIL = "john.demo@example.com"
CLIENT_NAME = "John Demo"
LINKED_CLIENT_EMAIL = "client@example.com"
LINKED_CLIENT_NAME = "Client Demo"
LINKED_CLIENT_PHONE = "+10000000003"
LINKED_ORDER_FORM_DATA = {
    "details": "I need a Telegram bot with booking and notifications.",
}
LINKED_ORDER_MESSAGE_BODY = "Hello, I added more details for the project."


def _disable_sql_echo() -> None:
    engine.echo = False


def demo_working_hours() -> list[dict]:
    hours: list[dict] = []
    for day in range(7):
        if day == 0:
            hours.append(
                {"day_of_week": 0, "is_open": False, "opens_at": None, "closes_at": None}
            )
        elif day == 6:
            hours.append(
                {
                    "day_of_week": 6,
                    "is_open": True,
                    "opens_at": "10:00",
                    "closes_at": "14:00",
                }
            )
        else:
            hours.append(
                {
                    "day_of_week": day,
                    "is_open": True,
                    "opens_at": "09:00",
                    "closes_at": "18:00",
                }
            )
    return hours


def _future_booking_start(*, hour: int = 10) -> tuple[datetime, datetime]:
    from zoneinfo import ZoneInfo

    tz = ZoneInfo("Europe/Moscow")
    now = datetime.now(tz)
    candidate_date = now.date() + timedelta(days=3)
    while candidate_date.weekday() >= 5:
        candidate_date += timedelta(days=1)
    starts_at = datetime.combine(candidate_date, time(hour, 0), tzinfo=tz)
    if starts_at <= now + timedelta(hours=3):
        candidate_date += timedelta(days=1)
        while candidate_date.weekday() >= 5:
            candidate_date += timedelta(days=1)
        starts_at = datetime.combine(candidate_date, time(hour, 0), tzinfo=tz)
    ends_at = starts_at + timedelta(minutes=60)
    return starts_at, ends_at


async def _ensure_user(
    session,
    users: UserRepository,
    *,
    email: str,
    password: str,
    role: UserRole,
    full_name: str,
    phone: str | None = None,
) -> tuple[object, str]:
    normalized_email = email.strip().lower()
    password_hash = hash_password(password)
    if not verify_password(password, password_hash):
        raise RuntimeError("demo_password_hash_verification_failed")

    user = await users.get_by_email(normalized_email)
    if user is None:
        user = await users.create(
            email=normalized_email,
            password_hash=password_hash,
            full_name=full_name,
            phone=phone,
            role=role,
        )
        user.email_verified_at = datetime.now(UTC)
        user.is_active = True
        await session.flush()
        return user, "created"

    user.password_hash = password_hash
    user.role = role
    user.full_name = full_name
    user.phone = phone
    user.is_active = True
    user.email_verified_at = datetime.now(UTC)
    await session.flush()
    return user, "updated"


async def _ensure_service(
    session,
    business_id,
    *,
    name: str,
    service_type: ServiceType,
    duration_minutes: int | None,
    price_type: PriceType,
    price_cents: int | None,
) -> tuple[Service, str]:
    stmt = select(Service).where(
        Service.business_id == business_id,
        Service.name == name,
    )
    result = await session.execute(stmt)
    service = result.scalar_one_or_none()
    if service is None:
        service = Service(
            business_id=business_id,
            name=name,
            type=service_type,
            duration_minutes=duration_minutes,
            price_type=price_type,
            price_cents=price_cents,
            currency="USD",
            is_active=True,
        )
        session.add(service)
        await session.flush()
        return service, "created"
    service.type = service_type
    service.duration_minutes = duration_minutes
    service.price_type = price_type
    service.price_cents = price_cents
    service.currency = "USD"
    service.is_active = True
    await session.flush()
    return service, "updated"


async def _ensure_lunch_breaks(session, business_id) -> str:
    stmt = select(WorkingBreak).where(
        WorkingBreak.business_id == business_id,
        WorkingBreak.label == "Lunch",
    )
    result = await session.execute(stmt)
    if result.scalars().first() is not None:
        return "skipped"
    schedule_repo = ScheduleRepository(session)
    for day in range(1, 6):
        await schedule_repo.create_break(
            WorkingBreak(
                business_id=business_id,
                label="Lunch",
                day_of_week=day,
                starts_at=time(13, 0),
                ends_at=time(14, 0),
            )
        )
    return "created"


async def seed_demo() -> dict:
    summary: dict[str, str] = {}

    async with async_session_factory() as session:
        users = UserRepository(session)
        businesses = BusinessRepository(session)
        clients = ClientRepository(session)
        schedule_repo = ScheduleRepository(session)

        superadmin, super_action = await _ensure_user(
            session,
            users,
            email=SUPERADMIN_EMAIL,
            password=DEMO_PASSWORD,
            role=UserRole.superadmin,
            full_name="Demo Superadmin",
        )
        summary["superadmin"] = super_action

        owner, owner_action = await _ensure_user(
            session,
            users,
            email=OWNER_EMAIL,
            password=DEMO_PASSWORD,
            role=UserRole.business_admin,
            full_name="Demo Owner",
        )
        summary["owner"] = owner_action

        business = await businesses.get_by_slug(BUSINESS_SLUG)
        if business is None:
            business = await businesses.create_business(
                name="Demo Service Business",
                slug=BUSINESS_SLUG,
                operating_mode=OperatingMode.both,
                timezone="Europe/Moscow",
                contact_email=OWNER_EMAIL,
            )
            summary["business"] = "created"
        else:
            await businesses.update_business(
                business,
                {
                    "name": "Demo Service Business",
                    "operating_mode": OperatingMode.both,
                    "timezone": "Europe/Moscow",
                    "status": BusinessStatus.active,
                    "contact_email": OWNER_EMAIL,
                },
            )
            summary["business"] = "updated"

        business.status = BusinessStatus.active
        await session.flush()

        member = await businesses.get_member(business.id, owner.id)
        if member is None:
            await businesses.create_member(
                business_id=business.id,
                user_id=owner.id,
                role=BusinessMemberRole.owner,
            )
            summary["business_member"] = "created"
        else:
            summary["business_member"] = "skipped"

        subscription = await businesses.get_subscription(business.id)
        if subscription is None:
            subscription = await businesses.create_subscription(business_id=business.id)
            summary["subscription"] = "created"
        else:
            summary["subscription"] = "updated"
        await businesses.update_subscription(
            subscription,
            {
                "plan": SubscriptionPlan.business,
                "status": SubscriptionStatus.active,
            },
        )

        booking_service, booking_svc_action = await _ensure_service(
            session,
            business.id,
            name="Arabic Lesson",
            service_type=ServiceType.booking,
            duration_minutes=60,
            price_type=PriceType.fixed,
            price_cents=5000,
        )
        summary["booking_service"] = booking_svc_action

        order_service, order_svc_action = await _ensure_service(
            session,
            business.id,
            name="Build Telegram Bot",
            service_type=ServiceType.order,
            duration_minutes=None,
            price_type=PriceType.quote,
            price_cents=None,
        )
        summary["order_service"] = order_svc_action

        await schedule_repo.replace_working_hours(business.id, demo_working_hours())
        summary["working_hours"] = "replaced"

        summary["working_breaks"] = await _ensure_lunch_breaks(session, business.id)

        client = await clients.find_by_email(business.id, CLIENT_EMAIL)
        if client is None:
            client = await clients.create(
                Client(
                    business_id=business.id,
                    full_name=CLIENT_NAME,
                    email=CLIENT_EMAIL,
                    phone="+15550199",
                    source=ClientSource.guest,
                )
            )
            summary["client"] = "created"
        else:
            client.full_name = CLIENT_NAME
            client.phone = "+15550199"
            await session.flush()
            summary["client"] = "updated"

        pending_stmt = select(Booking).where(
            Booking.business_id == business.id,
            Booking.client_id == client.id,
            Booking.status == BookingStatus.pending,
            Booking.starts_at > datetime.now(UTC),
        )
        pending_booking = (await session.execute(pending_stmt)).scalar_one_or_none()
        if pending_booking is None:
            starts_at, ends_at = _future_booking_start()
            year = starts_at.year
            reference = await generate_booking_reference(session, business.id, year)
            session.add(
                Booking(
                    business_id=business.id,
                    service_id=booking_service.id,
                    client_id=client.id,
                    reference=reference,
                    status=BookingStatus.pending,
                    starts_at=starts_at,
                    ends_at=ends_at,
                )
            )
            summary["sample_booking"] = "created"
        else:
            summary["sample_booking"] = "skipped"

        order_stmt = select(Order).where(
            Order.business_id == business.id,
            Order.client_id == client.id,
            Order.status == OrderStatus.submitted,
        )
        existing_order = (await session.execute(order_stmt)).scalar_one_or_none()
        if existing_order is None:
            year = datetime.now(UTC).year
            reference = await generate_order_reference(session, business.id, year)
            session.add(
                Order(
                    business_id=business.id,
                    service_id=order_service.id,
                    client_id=client.id,
                    reference=reference,
                    status=OrderStatus.submitted,
                    form_data={"brief": "Demo Telegram bot for notifications"},
                )
            )
            summary["sample_order"] = "created"
        else:
            summary["sample_order"] = "skipped"

        client_user, client_user_action = await _ensure_user(
            session,
            users,
            email=LINKED_CLIENT_EMAIL,
            password=DEMO_PASSWORD,
            role=UserRole.client,
            full_name=LINKED_CLIENT_NAME,
            phone=LINKED_CLIENT_PHONE,
        )
        summary["client_user"] = client_user_action

        linked_client = await clients.find_by_email(business.id, LINKED_CLIENT_EMAIL)
        if linked_client is None:
            linked_client = await clients.create(
                Client(
                    business_id=business.id,
                    user_id=client_user.id,
                    full_name=LINKED_CLIENT_NAME,
                    email=LINKED_CLIENT_EMAIL,
                    phone=LINKED_CLIENT_PHONE,
                    source=ClientSource.registered,
                )
            )
            summary["linked_client"] = "created"
        else:
            linked_client.user_id = client_user.id
            linked_client.full_name = LINKED_CLIENT_NAME
            linked_client.phone = LINKED_CLIENT_PHONE
            linked_client.source = ClientSource.registered
            await session.flush()
            summary["linked_client"] = "updated"

        linked_booking_stmt = select(Booking).where(
            Booking.business_id == business.id,
            Booking.client_id == linked_client.id,
            Booking.service_id == booking_service.id,
            Booking.starts_at > datetime.now(UTC),
        )
        linked_booking = (await session.execute(linked_booking_stmt)).scalar_one_or_none()
        if linked_booking is None:
            starts_at, ends_at = _future_booking_start(hour=11)
            year = starts_at.year
            reference = await generate_booking_reference(session, business.id, year)
            session.add(
                Booking(
                    business_id=business.id,
                    service_id=booking_service.id,
                    client_id=linked_client.id,
                    reference=reference,
                    status=BookingStatus.confirmed,
                    starts_at=starts_at,
                    ends_at=ends_at,
                )
            )
            summary["linked_booking"] = "created"
        else:
            summary["linked_booking"] = "skipped"

        linked_order_stmt = select(Order).where(
            Order.business_id == business.id,
            Order.client_id == linked_client.id,
            Order.service_id == order_service.id,
            Order.status.in_((OrderStatus.accepted, OrderStatus.in_progress)),
        )
        linked_order = (await session.execute(linked_order_stmt)).scalar_one_or_none()
        if linked_order is None:
            year = datetime.now(UTC).year
            reference = await generate_order_reference(session, business.id, year)
            linked_order = Order(
                business_id=business.id,
                service_id=order_service.id,
                client_id=linked_client.id,
                reference=reference,
                status=OrderStatus.in_progress,
                form_data=LINKED_ORDER_FORM_DATA,
            )
            session.add(linked_order)
            await session.flush()
            summary["linked_order"] = "created"
        else:
            linked_order.form_data = LINKED_ORDER_FORM_DATA
            if linked_order.status not in (
                OrderStatus.accepted,
                OrderStatus.in_progress,
            ):
                linked_order.status = OrderStatus.in_progress
            await session.flush()
            summary["linked_order"] = "updated"

        message_stmt = select(OrderMessage).where(
            OrderMessage.order_id == linked_order.id,
            OrderMessage.body == LINKED_ORDER_MESSAGE_BODY,
        )
        existing_message = (await session.execute(message_stmt)).scalar_one_or_none()
        if existing_message is None:
            session.add(
                OrderMessage(
                    order_id=linked_order.id,
                    business_id=business.id,
                    sender_type=OrderMessageSenderType.client,
                    sender_user_id=client_user.id,
                    body=LINKED_ORDER_MESSAGE_BODY,
                )
            )
            summary["linked_order_message"] = "created"
        else:
            summary["linked_order_message"] = "skipped"

        await session.commit()

        return {
            "summary": summary,
            "business_id": str(business.id),
            "booking_service_id": str(booking_service.id),
            "order_service_id": str(order_service.id),
        }


def _print_summary(result: dict) -> None:
    print("\nDemo seed complete.")
    print("\nActions:")
    for key, action in result["summary"].items():
        print(f"  {key}: {action}")

    print("\nDemo credentials:")
    print(f"  Superadmin: {SUPERADMIN_EMAIL}")
    print(f"  Owner:      {OWNER_EMAIL}")
    print(f"  Client:     {LINKED_CLIENT_EMAIL}")
    print(
        "  Demo users are ready. Use the documented demo password from README_BACKEND.md."
    )

    print("\nUseful URLs (host machine):")
    print("  API health:     http://localhost:8000/health")
    print("  API docs:       http://localhost:8000/docs")
    print(f"  Public business: http://localhost:8000/api/v1/public/b/{BUSINESS_SLUG}")
    print(
        f"  Public services: http://localhost:8000/api/v1/public/b/{BUSINESS_SLUG}/services"
    )

    print("\nIDs:")
    print(f"  business_id:        {result['business_id']}")
    print(f"  booking_service_id: {result['booking_service_id']}")
    print(f"  order_service_id:   {result['order_service_id']}")


async def main() -> int:
    _disable_sql_echo()
    print("Seeding demo data (idempotent)...")
    try:
        result = await seed_demo()
    except Exception as exc:
        print(f"\nSeed failed: {exc}", file=sys.stderr)
        return 1
    _print_summary(result)
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
