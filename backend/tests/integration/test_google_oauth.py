"""Integration tests for Google OAuth login (/auth/google).

The outbound call to Google's tokeninfo endpoint is mocked; everything else
runs through the real service layers against the test schema.
"""

import httpx

from app.config import settings
from app.models.organization import OrganizationMember
from app.models.user import User

VALID_CLIENT_ID = "test-google-client-id.apps.googleusercontent.com"

VALID_PAYLOAD = {
    "aud": VALID_CLIENT_ID,
    "email": "ada@google-oauth.com",
    "email_verified": True,
    "given_name": "Ada",
    "family_name": "Lovelace",
    "picture": "https://example.com/ada.jpg",
}


async def test_google_login_creates_new_user(client, db_session, mock_google_tokeninfo):
    mock_google_tokeninfo(VALID_PAYLOAD)
    resp = await client.post("/auth/google", json={"id_token": "jwt-token"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["access_token"]
    assert data["refresh_token"]
    assert data["token_type"] == "bearer"

    user = db_session.query(User).filter(User.email == VALID_PAYLOAD["email"]).first()
    assert user is not None
    assert user.email == VALID_PAYLOAD["email"]
    assert user.hashed_password is None


async def test_google_login_backfills_existing_user_profile(client, db_session, mock_google_tokeninfo):
    db_session.add(User(email=VALID_PAYLOAD["email"], hashed_password=None, name=None))
    db_session.commit()

    mock_google_tokeninfo(VALID_PAYLOAD)
    resp = await client.post("/auth/google", json={"id_token": "jwt-token"})
    assert resp.status_code == 200

    user = db_session.query(User).filter(User.email == VALID_PAYLOAD["email"]).first()
    assert user.name == "Ada Lovelace"
    assert user.avatar_url == "https://example.com/ada.jpg"
    assert db_session.query(User).filter(User.email == VALID_PAYLOAD["email"]).count() == 1


async def test_google_login_activates_pending_invite(client, db_session, mock_google_tokeninfo, test_org):
    pending = User(email=VALID_PAYLOAD["email"], hashed_password=None)
    db_session.add(pending)
    db_session.commit()
    db_session.refresh(pending)
    db_session.add(
        OrganizationMember(
            user_id=pending.id,
            organization_id=test_org.id,
            role="user",
            status="pending",
        )
    )
    db_session.commit()

    mock_google_tokeninfo(VALID_PAYLOAD)
    resp = await client.post("/auth/google", json={"id_token": "jwt-token"})
    assert resp.status_code == 200

    membership = (
        db_session.query(OrganizationMember)
        .filter(
            OrganizationMember.user_id == pending.id,
            OrganizationMember.organization_id == test_org.id,
        )
        .first()
    )
    assert membership.status == "active"


async def test_google_login_rejects_wrong_audience(client, mock_google_tokeninfo):
    payload = {**VALID_PAYLOAD, "aud": "other-client-id.apps.googleusercontent.com"}
    mock_google_tokeninfo(payload)
    resp = await client.post("/auth/google", json={"id_token": "jwt-token"})
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Invalid Google token."


async def test_google_login_skips_audience_check_when_client_id_unset(client, monkeypatch, mock_google_tokeninfo):
    monkeypatch.setattr(settings, "google_client_id", "")
    payload = {**VALID_PAYLOAD, "aud": "anything"}
    mock_google_tokeninfo(payload)
    resp = await client.post("/auth/google", json={"id_token": "jwt-token"})
    assert resp.status_code == 200


async def test_google_login_rejects_missing_email(client, mock_google_tokeninfo):
    payload = {k: v for k, v in VALID_PAYLOAD.items() if k != "email"}
    mock_google_tokeninfo(payload)
    resp = await client.post("/auth/google", json={"id_token": "jwt-token"})
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Google token does not contain email."


async def test_google_login_rejects_unverified_email(client, mock_google_tokeninfo):
    mock_google_tokeninfo({**VALID_PAYLOAD, "email_verified": False})
    resp = await client.post("/auth/google", json={"id_token": "jwt-token"})
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Google email not verified."


async def test_google_login_rejects_non_200_tokeninfo(client, mock_google_tokeninfo):
    mock_google_tokeninfo({}, status_code=400)
    resp = await client.post("/auth/google", json={"id_token": "jwt-token"})
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Invalid Google token"


async def test_google_login_handles_network_error(client, mock_google_tokeninfo):
    mock_google_tokeninfo(httpx.RequestError("connection refused", request=None))
    resp = await client.post("/auth/google", json={"id_token": "jwt-token"})
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Unable to verify Google token. Please try again."