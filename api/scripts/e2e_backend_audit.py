#!/usr/bin/env python3
"""HTTP end-to-end audit of the local API (requires running server + demo seed)."""

from __future__ import annotations

import os
import sys
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import httpx

BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
API = f"{BASE_URL}/api/v1"

DEMO_PASSWORD = "ChangeMe123!"
SUPERADMIN_EMAIL = "superadmin@example.com"
OWNER_EMAIL = "owner@example.com"
CLIENT_EMAIL = "client@example.com"
BUSINESS_SLUG = "demo-business"
BUSINESS_TZ = "Europe/Moscow"


class AuditError(Exception):
    pass


def _login(client: httpx.Client, email: str, password: str) -> str:
    response = client.post(
        f"{API}/auth/login",
        json={"email": email, "password": password},
    )
    if response.status_code != 200:
        raise AuditError(f"login failed ({response.status_code}): {response.text}")
    token = response.json()["tokens"]["access_token"]
    return token


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _slot_starts_at(slot: dict) -> datetime:
    return datetime.fromisoformat(slot["starts_at"])


def _find_bookable_slot(
    client: httpx.Client,
    *,
    slug: str,
    service_id: str,
) -> tuple[date, dict]:
    tz = ZoneInfo(BUSINESS_TZ)
    now = datetime.now(tz)
    for offset in range(1, 21):
        target = now.date() + timedelta(days=offset)
        day = (target.weekday() + 1) % 7
        if day == 0:
            continue
        response = client.get(
            f"{API}/public/b/{slug}/availability",
            params={"service_id": service_id, "date": target.isoformat()},
        )
        if response.status_code != 200:
            continue
        for slot in response.json().get("slots", []):
            starts = _slot_starts_at(slot)
            if starts > now + timedelta(hours=3):
                return target, slot
    raise AuditError("no available booking slot found in next 20 days")


def run_audit() -> int:
    failures: list[str] = []
    skips: list[str] = []
    state: dict = {}

    def step(name: str, fn, *, critical: bool = True, allow_skip: bool = False) -> None:
        try:
            result = fn()
            if result == "SKIP":
                skips.append(name)
                print(f"SKIP  {name}")
            else:
                print(f"PASS  {name}")
        except Exception as exc:
            if allow_skip:
                skips.append(name)
                print(f"SKIP  {name} ({exc})")
                return
            print(f"FAIL  {name}: {exc}")
            if critical:
                failures.append(name)

    with httpx.Client(timeout=30.0) as client:

        def a_health() -> None:
            response = client.get(f"{BASE_URL}/health")
            if response.status_code != 200:
                raise AuditError(f"/health returned {response.status_code}")
            response = client.get(f"{API}/health")
            if response.status_code != 200:
                raise AuditError(f"/api/v1/health returned {response.status_code}")

        def b_owner_login() -> None:
            state["owner_token"] = _login(client, OWNER_EMAIL, DEMO_PASSWORD)

        def c_superadmin_login() -> None:
            state["superadmin_token"] = _login(client, SUPERADMIN_EMAIL, DEMO_PASSWORD)

        def d_superadmin_read_business() -> None:
            response = client.get(
                f"{API}/superadmin/businesses",
                headers=_auth_headers(state["superadmin_token"]),
                params={"search": BUSINESS_SLUG},
            )
            if response.status_code != 200:
                raise AuditError(response.text)
            matches = [b for b in response.json()["data"] if b["slug"] == BUSINESS_SLUG]
            if not matches:
                raise AuditError("demo business not found")
            state["business_id"] = matches[0]["id"]
            if matches[0]["status"] != "active":
                patch = client.patch(
                    f"{API}/superadmin/businesses/{state['business_id']}",
                    headers=_auth_headers(state["superadmin_token"]),
                    json={"status": "active"},
                )
                if patch.status_code != 200:
                    raise AuditError(f"activate failed: {patch.text}")

        def e_owner_login_again() -> None:
            state["owner_token"] = _login(client, OWNER_EMAIL, DEMO_PASSWORD)

        def f_owner_profile() -> None:
            response = client.get(
                f"{API}/businesses/{state['business_id']}",
                headers=_auth_headers(state["owner_token"]),
            )
            if response.status_code != 200:
                raise AuditError(response.text)
            if response.json()["slug"] != BUSINESS_SLUG:
                raise AuditError("unexpected business slug")

        def g_owner_services() -> None:
            response = client.get(
                f"{API}/businesses/{state['business_id']}/services",
                headers=_auth_headers(state["owner_token"]),
            )
            if response.status_code != 200:
                raise AuditError(response.text)
            services = response.json().get("data", response.json())
            if not services:
                raise AuditError("no services returned")
            booking = next((s for s in services if s["type"] == "booking"), None)
            order = next((s for s in services if s["type"] == "order"), None)
            if booking is None or order is None:
                raise AuditError("missing demo booking/order service")
            state["booking_service_id"] = booking["id"]
            state["order_service_id"] = order["id"]

        def h_owner_schedule() -> None:
            response = client.get(
                f"{API}/businesses/{state['business_id']}/schedule",
                headers=_auth_headers(state["owner_token"]),
            )
            if response.status_code != 200:
                raise AuditError(response.text)
            hours = response.json().get("working_hours", [])
            if len(hours) < 7:
                raise AuditError("working hours incomplete")

        def i_public_business() -> None:
            response = client.get(f"{API}/public/b/{BUSINESS_SLUG}")
            if response.status_code != 200:
                raise AuditError(response.text)
            body = response.json()
            if body.get("settings") is not None:
                raise AuditError("public business leaked settings")

        def j_public_catalog() -> None:
            response = client.get(f"{API}/public/b/{BUSINESS_SLUG}/services")
            if response.status_code != 200:
                raise AuditError(response.text)
            if len(response.json()) < 1:
                raise AuditError("empty public catalog")

        def k_public_availability() -> None:
            target, slot = _find_bookable_slot(
                client,
                slug=BUSINESS_SLUG,
                service_id=state["booking_service_id"],
            )
            state["booking_date"] = target
            state["booking_slot"] = slot

        def l_public_booking() -> None:
            slot = state["booking_slot"]
            response = client.post(
                f"{API}/public/b/{BUSINESS_SLUG}/bookings",
                json={
                    "service_id": state["booking_service_id"],
                    "starts_at": slot["starts_at"],
                    "legal_consent_accepted": True,
                    "client": {
                        "full_name": "E2E Audit Client",
                        "email": "e2e.audit@example.com",
                        "phone": "+15550200",
                    },
                },
            )
            if response.status_code != 201:
                raise AuditError(response.text)
            state["booking_id"] = response.json()["id"]
            state["booked_starts_at"] = slot["starts_at"]

        def m_booking_blocks_slot() -> None:
            response = client.get(
                f"{API}/public/b/{BUSINESS_SLUG}/availability",
                params={
                    "service_id": state["booking_service_id"],
                    "date": state["booking_date"].isoformat(),
                },
            )
            if response.status_code != 200:
                raise AuditError(response.text)
            starts_values = {s["starts_at"] for s in response.json().get("slots", [])}
            if state["booked_starts_at"] in starts_values:
                raise AuditError("booked slot still available")

        def n_admin_list_booking() -> None:
            response = client.get(
                f"{API}/businesses/{state['business_id']}/bookings",
                headers=_auth_headers(state["owner_token"]),
            )
            if response.status_code != 200:
                raise AuditError(response.text)
            ids = {item["id"] for item in response.json()["data"]}
            if state["booking_id"] not in ids:
                raise AuditError("created booking not in admin list")

        def o_admin_confirm_booking() -> None:
            response = client.patch(
                f"{API}/businesses/{state['business_id']}/bookings/{state['booking_id']}",
                headers=_auth_headers(state["owner_token"]),
                json={"status": "confirmed"},
            )
            if response.status_code != 200:
                raise AuditError(response.text)
            if response.json()["status"] != "confirmed":
                raise AuditError("booking not confirmed")

        def p_client_self_service() -> None:
            try:
                state["client_token"] = _login(client, CLIENT_EMAIL, DEMO_PASSWORD)
            except AuditError as exc:
                raise AuditError(
                    f"{exc}. Run: docker compose exec api python scripts/seed_demo.py"
                ) from exc

            bookings_response = client.get(
                f"{API}/me/bookings",
                headers=_auth_headers(state["client_token"]),
                params={"status": "upcoming"},
            )
            if bookings_response.status_code != 200:
                raise AuditError(
                    f"/me/bookings failed ({bookings_response.status_code}): "
                    f"{bookings_response.text}. "
                    "Run: docker compose exec api python scripts/seed_demo.py"
                )
            bookings = bookings_response.json().get("data", [])
            if not bookings:
                raise AuditError(
                    "no linked bookings in /me/bookings — "
                    "run: docker compose exec api python scripts/seed_demo.py"
                )

            orders_response = client.get(
                f"{API}/me/orders",
                headers=_auth_headers(state["client_token"]),
                params={"status": "active"},
            )
            if orders_response.status_code != 200:
                raise AuditError(
                    f"/me/orders failed ({orders_response.status_code}): "
                    f"{orders_response.text}. "
                    "Run: docker compose exec api python scripts/seed_demo.py"
                )
            orders = orders_response.json().get("data", [])
            if not orders:
                raise AuditError(
                    "no linked orders in /me/orders — "
                    "run: docker compose exec api python scripts/seed_demo.py"
                )

            order_id = orders[0]["id"]
            messages_response = client.get(
                f"{API}/me/orders/{order_id}/messages",
                headers=_auth_headers(state["client_token"]),
            )
            if messages_response.status_code != 200:
                raise AuditError(f"/me/orders/{{id}}/messages failed: {messages_response.text}")

            send_response = client.post(
                f"{API}/me/orders/{order_id}/messages",
                headers=_auth_headers(state["client_token"]),
                json={"body": "E2E audit client follow-up message."},
            )
            if send_response.status_code != 201:
                raise AuditError(f"client message send failed: {send_response.text}")

        def q_public_order() -> None:
            response = client.post(
                f"{API}/public/b/{BUSINESS_SLUG}/orders",
                json={
                    "service_id": state["order_service_id"],
                    "form_data": {"brief": "E2E audit order"},
                    "legal_consent_accepted": True,
                    "client": {
                        "full_name": "E2E Order Client",
                        "email": "e2e.order@example.com",
                        "phone": "+15550300",
                    },
                },
            )
            if response.status_code != 201:
                raise AuditError(response.text)
            state["order_id"] = response.json()["id"]

        def r_admin_list_order() -> None:
            response = client.get(
                f"{API}/businesses/{state['business_id']}/orders",
                headers=_auth_headers(state["owner_token"]),
            )
            if response.status_code != 200:
                raise AuditError(response.text)
            ids = {item["id"] for item in response.json()["data"]}
            if state["order_id"] not in ids:
                raise AuditError("created order not in admin list")

        def s_admin_accept_order() -> None:
            response = client.post(
                f"{API}/businesses/{state['business_id']}/orders/{state['order_id']}/accept",
                headers=_auth_headers(state["owner_token"]),
                json={},
            )
            if response.status_code != 200:
                raise AuditError(response.text)
            if response.json()["status"] not in {"accepted", "in_progress"}:
                raise AuditError("order not accepted")

        def t_admin_order_message() -> None:
            response = client.post(
                f"{API}/businesses/{state['business_id']}/orders/{state['order_id']}/messages",
                headers=_auth_headers(state["owner_token"]),
                json={"body": "Thanks — we received your order."},
            )
            if response.status_code != 201:
                raise AuditError(response.text)

        def u_owner_denied_superadmin() -> None:
            response = client.get(
                f"{API}/superadmin/businesses",
                headers=_auth_headers(state["owner_token"]),
            )
            if response.status_code != 403:
                raise AuditError(f"expected 403, got {response.status_code}")

        steps = [
            ("A. Health works", a_health),
            ("B. Demo owner login", b_owner_login),
            ("C. Superadmin login", c_superadmin_login),
            ("D. Superadmin read/activate business", d_superadmin_read_business),
            ("E. Owner login", e_owner_login_again),
            ("F. Owner business profile", f_owner_profile),
            ("G. Owner list services", g_owner_services),
            ("H. Owner schedule", h_owner_schedule),
            ("I. Public business endpoint", i_public_business),
            ("J. Public service catalog", j_public_catalog),
            ("K. Public availability", k_public_availability),
            ("L. Public booking creation", l_public_booking),
            ("M. Booking blocks availability", m_booking_blocks_slot),
            ("N. Admin list booking", n_admin_list_booking),
            ("O. Admin confirm booking", o_admin_confirm_booking),
            ("P. Client self-service", p_client_self_service),
            ("Q. Public order creation", q_public_order),
            ("R. Admin list order", r_admin_list_order),
            ("S. Admin accept order", s_admin_accept_order),
            ("T. Admin order message", t_admin_order_message),
            ("U. Non-admin denied superadmin", u_owner_denied_superadmin),
        ]

        print(f"E2E backend audit against {BASE_URL}\n")
        for label, fn in steps:
            step(label, fn)

    print("\n--- Summary ---")
    passed = len(steps) - len(failures) - len(skips)
    print(f"Passed: {passed}, Skipped: {len(skips)}, Failed: {len(failures)}")
    if failures:
        print("Critical failures:")
        for name in failures:
            print(f"  - {name}")
        return 1
    print("\nAll critical steps passed.")
    return 0


def main() -> int:
    try:
        return run_audit()
    except httpx.ConnectError as exc:
        print(f"Cannot connect to API at {BASE_URL}: {exc}", file=sys.stderr)
        print("Ensure the API container is running: docker compose up -d", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
