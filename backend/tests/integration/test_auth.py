"""Integration tests for the auth endpoints (register / login / refresh / me)."""

import pytest

from app.core.security import decode_access_token
from app.models.user import User

REGISTER_PAYLOAD = {"email": "alice@example.com", "password": "AlicetheGreat1!"}


async def _register(client, payload=REGISTER_PAYLOAD):
    return await client.post("/auth/register", json=payload)


async def _login(client, username="alice@example.com", password="AlicetheGreat1!"):
    return await client.post(
        "/auth/login", data={"username": username, "password": password}
    )


# ---------------------------------------------------------------------------
# Register
# ---------------------------------------------------------------------------
async def test_register_creates_user(client, db_session):
    resp = await _register(client)
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "alice@example.com"
    assert data["name"] == "alice"
    assert "id" in data
    assert db_session.query(User).filter(User.email == "alice@example.com").count() == 1


async def test_register_duplicate_email_rejected(client, db_session):
    assert (await _register(client)).status_code == 201
    resp = await _register(client)
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Email already registered"


async def test_register_activates_pending_membership(client, db_session, test_org, test_user):
    from app.models.organization import OrganizationMember
    from app.models.user import User

    pending_user = User(email="pending-guy@example.com", hashed_password=None)
    db_session.add(pending_user)
    db_session.commit()
    db_session.refresh(pending_user)
    db_session.add(
        OrganizationMember(
            user_id=pending_user.id,
            organization_id=test_org.id,
            role="user",
            status="pending",
        )
    )
    db_session.commit()

    resp = await client.post(
        "/auth/register", json={"email": "pending-guy@example.com", "password": "PendingPass1!"}
    )
    assert resp.status_code == 201

    membership = (
        db_session.query(OrganizationMember)
        .filter(
            OrganizationMember.user_id == pending_user.id,
            OrganizationMember.organization_id == test_org.id,
        )
        .first()
    )
    assert membership.status == "active"


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------
async def test_login_success_returns_token_pair(client, db_session):
    await _register(client)
    resp = await _login(client)
    assert resp.status_code == 200
    data = resp.json()
    assert data["token_type"] == "bearer"
    assert data["access_token"]
    assert data["refresh_token"]
    assert decode_access_token(data["access_token"]) is not None


async def test_login_wrong_password_rejected(client, db_session):
    await _register(client)
    resp = await _login(client, password="WrongPassword1!")
    assert resp.status_code == 401


async def test_login_unknown_email_rejected(client):
    resp = await _login(client, username="nobody@example.com")
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# /auth/me
# ---------------------------------------------------------------------------
async def test_me_requires_authentication(client):
    resp = await client.get("/auth/me")
    assert resp.status_code == 401


async def test_me_with_valid_token(client, test_user, auth_headers):
    resp = await client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == test_user.email
    assert data["id"] == test_user.id


async def test_me_with_invalid_token(client):
    resp = await client.get("/auth/me", headers={"Authorization": "Bearer bogus.token.here"})
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Refresh / logout
# ---------------------------------------------------------------------------
async def test_refresh_issues_new_access_token(client, db_session):
    await _register(client)
    login = (await _login(client)).json()

    resp = await client.post("/auth/refresh", json={"refresh_token": login["refresh_token"]})
    assert resp.status_code == 200
    new_token = resp.json()["access_token"]
    assert decode_access_token(new_token)["sub"] == decode_access_token(
        login["access_token"]
    )["sub"]


async def test_refresh_with_unknown_token_rejected(client):
    resp = await client.post("/auth/refresh", json={"refresh_token": "garbage"})
    assert resp.status_code == 401


async def test_logout_revokes_refresh_token(client, db_session):
    await _register(client)
    login = (await _login(client)).json()

    resp = await client.post("/auth/logout", json={"refresh_token": login["refresh_token"]})
    assert resp.status_code == 200

    resp = await client.post("/auth/refresh", json={"refresh_token": login["refresh_token"]})
    assert resp.status_code == 401


async def test_logout_idempotent_for_unknown_token(client):
    resp = await client.post("/auth/logout", json={"refresh_token": "unknown-token"})
    assert resp.status_code == 200