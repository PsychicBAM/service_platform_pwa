import uuid

import pytest

from app.exceptions.auth import InvalidTokenError
from app.models.enums import UserRole
from app.services.password_service import (
    hash_password,
    validate_password,
    verify_password,
)
from app.services.token_service import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_token_subject,
    get_token_type,
)


def test_password_hashing_and_verification() -> None:
    password = "securePass123"
    hashed = hash_password(password)
    assert verify_password(password, hashed)
    assert not verify_password("wrongPassword", hashed)


def test_password_minimum_length_validation() -> None:
    with pytest.raises(ValueError, match="at least 8"):
        validate_password("short")


def test_access_token_create_and_decode() -> None:
    user_id = uuid.uuid4()
    token = create_access_token(user_id, UserRole.business_admin.value)
    payload = decode_token(token)
    assert payload["sub"] == str(user_id)
    assert payload["type"] == "access"
    assert payload["role"] == UserRole.business_admin.value


def test_refresh_token_create_and_decode() -> None:
    user_id = uuid.uuid4()
    token = create_refresh_token(user_id)
    payload = decode_token(token)
    assert payload["sub"] == str(user_id)
    assert payload["type"] == "refresh"
    assert get_token_type(token) == "refresh"
    assert get_token_subject(token) == user_id


def test_invalid_token_rejected() -> None:
    with pytest.raises(InvalidTokenError):
        decode_token("not.a.valid.token")
