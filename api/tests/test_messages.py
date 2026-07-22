import pytest
from httpx import AsyncClient

from tests.test_me_orders_routes import _setup_user_linked_order


async def _create_conversation(async_client: AsyncClient, ctx: dict) -> dict:
    response = await async_client.post(
        "/api/v1/me/messages/conversations",
        json={"business_id": ctx["business_id"]},
        headers=ctx["client_headers"],
    )
    assert response.status_code == 201
    return response.json()


async def _client_send(
    async_client: AsyncClient, ctx: dict, conversation_id: str, body: str = "Client hello"
):
    return await async_client.post(
        f"/api/v1/me/messages/conversations/{conversation_id}/messages",
        json={"body": body},
        headers=ctx["client_headers"],
    )


@pytest.mark.asyncio
async def test_admin_only_sees_own_business_conversations(
    async_client: AsyncClient, db_session
) -> None:
    first = await _setup_user_linked_order(async_client, db_session, "inbox-admin-one")
    second = await _setup_user_linked_order(async_client, db_session, "inbox-admin-two")
    await _create_conversation(async_client, first)
    second_conversation = await _create_conversation(async_client, second)

    response = await async_client.get(
        f"/api/v1/businesses/{first['business_id']}/messages/conversations",
        headers=first["headers"],
    )
    assert response.status_code == 200
    ids = {item["id"] for item in response.json()["items"]}
    assert second_conversation["id"] not in ids


@pytest.mark.asyncio
async def test_client_only_sees_own_conversations(
    async_client: AsyncClient, db_session
) -> None:
    first = await _setup_user_linked_order(async_client, db_session, "inbox-client-one")
    second = await _setup_user_linked_order(async_client, db_session, "inbox-client-two")
    first_conversation = await _create_conversation(async_client, first)
    second_conversation = await _create_conversation(async_client, second)

    listing = await async_client.get(
        "/api/v1/me/messages/conversations", headers=first["client_headers"]
    )
    assert listing.status_code == 200
    assert first_conversation["id"] in {item["id"] for item in listing.json()["items"]}
    assert second_conversation["id"] not in {item["id"] for item in listing.json()["items"]}
    denied = await async_client.get(
        f"/api/v1/me/messages/conversations/{second_conversation['id']}",
        headers=first["client_headers"],
    )
    assert denied.status_code == 404


@pytest.mark.asyncio
async def test_admin_and_client_can_send_plain_text_messages(
    async_client: AsyncClient, db_session
) -> None:
    ctx = await _setup_user_linked_order(async_client, db_session, "inbox-send")
    conversation = await _create_conversation(async_client, ctx)
    client_message = await _client_send(
        async_client, ctx, conversation["id"], "<strong>Need help</strong>"
    )
    assert client_message.status_code == 201
    assert client_message.json()["body"] == "<strong>Need help</strong>"

    admin_message = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/messages/conversations/{conversation['id']}/messages",
        json={"body": "We can help."},
        headers=ctx["headers"],
    )
    assert admin_message.status_code == 201
    assert admin_message.json()["sender_type"] == "business"


@pytest.mark.asyncio
async def test_empty_body_is_rejected_and_cross_business_is_not_found(
    async_client: AsyncClient, db_session
) -> None:
    first = await _setup_user_linked_order(async_client, db_session, "inbox-empty-one")
    second = await _setup_user_linked_order(async_client, db_session, "inbox-empty-two")
    conversation = await _create_conversation(async_client, first)
    empty = await _client_send(async_client, first, conversation["id"], "   ")
    assert empty.status_code == 422

    other_conversation = await _create_conversation(async_client, second)
    denied = await async_client.get(
        f"/api/v1/businesses/{first['business_id']}/messages/conversations/{other_conversation['id']}",
        headers=first["headers"],
    )
    assert denied.status_code == 404


@pytest.mark.asyncio
async def test_opening_conversation_marks_messages_read_and_updates_unread_count(
    async_client: AsyncClient, db_session
) -> None:
    ctx = await _setup_user_linked_order(async_client, db_session, "inbox-read")
    conversation = await _create_conversation(async_client, ctx)
    assert (await _client_send(async_client, ctx, conversation["id"])).status_code == 201

    before = await async_client.get(
        f"/api/v1/businesses/{ctx['business_id']}/messages/unread-count",
        headers=ctx["headers"],
    )
    assert before.json()["unread_total"] == 1
    opened = await async_client.get(
        f"/api/v1/businesses/{ctx['business_id']}/messages/conversations/{conversation['id']}",
        headers=ctx["headers"],
    )
    assert opened.status_code == 200
    after = await async_client.get(
        f"/api/v1/businesses/{ctx['business_id']}/messages/unread-count",
        headers=ctx["headers"],
    )
    assert after.json()["unread_total"] == 0


@pytest.mark.asyncio
async def test_admin_can_archive_and_unarchive_conversation(
    async_client: AsyncClient, db_session
) -> None:
    ctx = await _setup_user_linked_order(async_client, db_session, "inbox-archive")
    conversation = await _create_conversation(async_client, ctx)
    archive_url = (
        f"/api/v1/businesses/{ctx['business_id']}/messages/conversations/"
        f"{conversation['id']}/archive"
    )
    archived = await async_client.post(archive_url, headers=ctx["headers"])
    assert archived.status_code == 200
    assert archived.json()["status"] == "archived"
    unarchived = await async_client.post(
        archive_url.replace("/archive", "/unarchive"), headers=ctx["headers"]
    )
    assert unarchived.status_code == 200
    assert unarchived.json()["status"] == "open"
