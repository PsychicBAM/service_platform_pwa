"""Helpers for attaching authenticated clients to public booking/order creates."""

from __future__ import annotations

import uuid

from app.models.enums import UserRole
from app.models.user import User


def resolve_attach_user_id(
    current_user: User | None,
    submitted_email: str | None,
) -> tuple[uuid.UUID | None, bool]:
    """Return (attach_user_id, linked_to_account).

    Only client-role users with a matching email are attached.
    Business/admin accounts never become Clients via public forms.
    """
    if current_user is None or current_user.role != UserRole.client:
        return None, False
    if not submitted_email or not current_user.email:
        return None, False
    if submitted_email.strip().lower() != current_user.email.strip().lower():
        return None, False
    return current_user.id, True
