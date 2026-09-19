"""Unit tests for the low-level security primitives (JWT, password hashing)."""

from datetime import datetime, timedelta, timezone

from jose import jwt

from app.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_hash_and_verify_password_roundtrip():
    hashed = hash_password("SomePassword123!")
    assert hashed != "SomePassword123!"
    assert verify_password("SomePassword123!", hashed) is True


def test_verify_password_rejects_wrong_password():
    hashed = hash_password("SomePassword123!")
    assert verify_password("WrongPassword123!", hashed) is False


def test_create_access_token_decode_roundtrip():
    token = create_access_token({"sub": "42"})
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == "42"


def test_decode_access_token_garbage_is_none():
    assert decode_access_token("not.a.jwt") is None


def test_decode_access_token_tampered_is_none():
    token = create_access_token({"sub": "42"})
    tampered = token[:-4] + "AAAA"
    assert tampered != token
    assert decode_access_token(tampered) is None


def test_decode_access_token_expired_is_none():
    expired = jwt.encode(
        {"sub": "1", "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
        settings.secret_key,
        algorithm=settings.algorithm,
    )
    assert decode_access_token(expired) is None


def test_refresh_tokens_are_random():
    tokens = {create_refresh_token() for _ in range(100)}
    assert len(tokens) == 100
    for token in tokens:
        assert len(token) >= 32