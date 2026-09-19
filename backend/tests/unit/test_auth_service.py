"""Unit tests for AuthService (refresh-token lifecycle)."""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException

from app.core.security import decode_access_token
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.services.auth_service import AuthService


@pytest.fixture
def user(db_session):
    from app.core.security import hash_password

    u = User(
        email="authsvc@example.com",
        hashed_password=hash_password("Password123!"),
    )
    db_session.add(u)
    db_session.commit()
    db_session.refresh(u)
    return u


def _utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def test_create_token_user_persists_refresh_token(db_session, user):
    tokens = AuthService.create_token_user(db=db_session, user_id=user.id)

    assert "access_token" in tokens
    assert "refresh_token" in tokens
    assert decode_access_token(tokens["access_token"])["sub"] == str(user.id)

    record = (
        db_session.query(RefreshToken)
        .filter(RefreshToken.token == tokens["refresh_token"])
        .first()
    )
    assert record is not None
    assert record.user_id == user.id
    assert record.revoked is False
    assert record.expires_at > _utcnow()


def test_refresh_access_token_returns_new_valid_token(db_session, user):
    tokens = AuthService.create_token_user(db=db_session, user_id=user.id)

    access_token = AuthService.refresh_access_token(
        db=db_session, refresh_token_str=tokens["refresh_token"]
    )
    # same subject, and decodes to a valid payload
    assert decode_access_token(access_token)["sub"] == str(user.id)
    assert decode_access_token(access_token)["sub"] == decode_access_token(
        tokens["access_token"]
    )["sub"]


def test_refresh_access_token_invalid_raises(db_session, user):
    with pytest.raises(HTTPException) as exc_info:
        AuthService.refresh_access_token(
            db=db_session, refresh_token_str="does-not-exist"
        )
    assert exc_info.value.status_code == 401


def test_refresh_access_token_revoked_raises(db_session, user):
    tokens = AuthService.create_token_user(db=db_session, user_id=user.id)
    AuthService.revoke_refresh_token(
        db=db_session, refresh_token_str=tokens["refresh_token"]
    )

    with pytest.raises(HTTPException) as exc_info:
        AuthService.refresh_access_token(
            db=db_session, refresh_token_str=tokens["refresh_token"]
        )
    assert exc_info.value.status_code == 401


def test_refresh_access_token_expired_raises(db_session, user):
    db_session.add(
        RefreshToken(
            user_id=user.id,
            token="expired-token",
            expires_at=_utcnow() - timedelta(minutes=1),
        )
    )
    db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        AuthService.refresh_access_token(
            db=db_session, refresh_token_str="expired-token"
        )
    assert exc_info.value.status_code == 401


def test_revoke_refresh_token_marks_record(db_session, user):
    tokens = AuthService.create_token_user(db=db_session, user_id=user.id)

    AuthService.revoke_refresh_token(
        db=db_session, refresh_token_str=tokens["refresh_token"]
    )

    record = (
        db_session.query(RefreshToken)
        .filter(RefreshToken.token == tokens["refresh_token"])
        .first()
    )
    assert record.revoked is True


def test_revoke_unknown_token_is_noop(db_session):
    AuthService.revoke_refresh_token(db=db_session, refresh_token_str="nope")