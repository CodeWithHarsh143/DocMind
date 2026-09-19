"""Integration tests for the OTP-based password reset flow.

These hit the real Redis test instance (db 1) so expiry/storage/attempt
behaviour is verified for real. Email delivery is mocked; the OTP code is
captured in ``mock_otp_email`` or recovered from the router's log fallback.
"""

import logging
import re

import pytest
from jose import jwt

from app.config import settings
from app.core.security import hash_password
from app.models.user import User

IDENTIFIER = "otpuser@example.com"
NEW_PASSWORD = "FreshPassword1!"


@pytest.fixture
async def request_otp(client, mock_otp_email):
    async def _do(identifier: str = IDENTIFIER) -> dict:
        resp = await client.post("/auth/request-otp", json={"identifier": identifier})
        assert resp.status_code == 200
        return mock_otp_email[identifier.lower().strip()]

    return _do


async def _verify(client, identifier=IDENTIFIER, code="000000"):
    return await client.post(
        "/auth/verify-otp", json={"identifier": identifier, "code": code}
    )


# ---------------------------------------------------------------------------
# Request OTP
# ---------------------------------------------------------------------------
async def test_request_otp_stores_hash_with_zero_attempts(client, otp_redis, mock_otp_email):
    resp = await client.post("/auth/request-otp", json={"identifier": IDENTIFIER})
    assert resp.status_code == 200
    assert resp.json()["expires_in"] == 600

    stored = otp_redis.get(f"otp:{IDENTIFIER}")
    assert stored is not None
    hash_part, attempts = stored.split(":")
    assert hash_part != "000000"
    assert attempts == "0"
    assert otp_redis.ttl(f"otp:{IDENTIFIER}") > 0


async def test_request_otp_normalizes_identifier(client, otp_redis, mock_otp_email):
    await client.post("/auth/request-otp", json={"identifier": "  OTPUser@Example.COM "})
    assert otp_redis.get("otp:otpuser@example.com") is not None


# ---------------------------------------------------------------------------
# Verify OTP
# ---------------------------------------------------------------------------
async def test_verify_otp_with_correct_code(client, otp_redis, request_otp):
    code = await request_otp()
    resp = await _verify(client, code=code)
    assert resp.status_code == 200
    body = resp.json()
    assert body["verified"] is True
    payload = jwt.decode(
        body["reset_token"], settings.secret_key, algorithms=[settings.algorithm]
    )
    assert "sub" in payload


async def test_verify_otp_with_wrong_code_increments_attempts(client, otp_redis, request_otp):
    await request_otp()
    resp = await _verify(client, code="111111")
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Invalid OTP."

    stored = otp_redis.get(f"otp:{IDENTIFIER}")
    assert stored.split(":")[1] == "1"


async def test_verify_otp_locks_after_five_failed_attempts(client, otp_redis, request_otp):
    await request_otp()
    for _ in range(5):
        resp = await _verify(client, code="111111")
        assert resp.status_code == 400
        assert resp.json()["detail"] == "Invalid OTP."

    resp = await _verify(client, code="111111")
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Too many failed attempts."
    assert otp_redis.get(f"otp:{IDENTIFIER}") is None


async def test_verify_otp_without_request_expired(client, otp_redis):
    resp = await _verify(client, identifier="never-requested@example.com")
    assert resp.status_code == 400
    assert resp.json()["detail"] == "OTP expired or not found."


async def test_verify_otp_still_works_after_some_wrong_attempts(client, otp_redis, request_otp):
    code = await request_otp()
    for _ in range(3):
        await _verify(client, code="111111")
    resp = await _verify(client, code=code)
    assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Reset password
# ---------------------------------------------------------------------------
async def test_reset_password_updates_existing_user(client, db_session, otp_redis, request_otp):
    user = User(email=IDENTIFIER, hashed_password=hash_password("OldPassword1!"))
    db_session.add(user)
    db_session.commit()

    code = await request_otp()
    resp = await client.post(
        "/auth/reset-password",
        json={"identifier": IDENTIFIER, "code": code, "new_password": NEW_PASSWORD},
    )
    assert resp.status_code == 200
    assert resp.json()["detail"] == "Password updated"

    old_login = await client.post(
        "/auth/login", data={"username": IDENTIFIER, "password": "OldPassword1!"}
    )
    new_login = await client.post(
        "/auth/login", data={"username": IDENTIFIER, "password": NEW_PASSWORD}
    )
    assert old_login.status_code == 401
    assert new_login.status_code == 200


async def test_reset_password_creates_new_user(client, db_session, otp_redis, request_otp):
    identifier = "brand-new@example.com"
    assert db_session.query(User).filter(User.email == identifier).count() == 0

    code = await request_otp(identifier)
    resp = await client.post(
        "/auth/reset-password",
        json={"identifier": identifier, "code": code, "new_password": NEW_PASSWORD},
    )
    assert resp.status_code == 200

    login = await client.post(
        "/auth/login", data={"username": identifier, "password": NEW_PASSWORD}
    )
    assert login.status_code == 200


async def test_reset_password_wrong_code_rejected(client, db_session, otp_redis, request_otp):
    await request_otp()
    resp = await client.post(
        "/auth/reset-password",
        json={"identifier": IDENTIFIER, "code": "999999", "new_password": NEW_PASSWORD},
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == "That code did not verify. Please try again."


async def test_reset_password_weak_password_rejected(client, db_session, otp_redis, request_otp):
    await request_otp()
    resp = await client.post(
        "/auth/reset-password",
        json={"identifier": IDENTIFIER, "code": "000000", "new_password": "weak"},
    )
    assert resp.status_code == 422


async def test_reset_password_deletes_otp_key(client, db_session, otp_redis, request_otp):
    code = await request_otp()
    await client.post(
        "/auth/reset-password",
        json={"identifier": IDENTIFIER, "code": code, "new_password": NEW_PASSWORD},
    )
    assert otp_redis.get(f"otp:{IDENTIFIER}") is None


# ---------------------------------------------------------------------------
# Email failure fallback (code is logged instead of emailed)
# ---------------------------------------------------------------------------
async def test_request_otp_logs_code_when_email_fails(client, monkeypatch, otp_redis, caplog):
    def broken_email(to, code):
        raise RuntimeError("smtp down")

    monkeypatch.setattr(
        "app.services.email_service.EmailService.send_otp_email",
        staticmethod(broken_email),
    )

    with caplog.at_level(logging.INFO, logger="app.routers.auth"):
        resp = await client.post("/auth/request-otp", json={"identifier": IDENTIFIER})
    assert resp.status_code == 200

    match = re.search(r"falling back to log: (\d{6})", caplog.text)
    assert match is not None, caplog.text

    verification = await _verify(client, code=match.group(1))
    assert verification.status_code == 200