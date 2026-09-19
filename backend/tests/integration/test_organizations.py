"""Integration tests for organization + member + invite endpoints."""

import base64

from app.models.organization import Organization, OrganizationMember
from app.models.user import User

TINY_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUB"
    "AScY42YAAAAASUVORK5CYII="
)


# ---------------------------------------------------------------------------
# Organization CRUD
# ---------------------------------------------------------------------------
async def test_create_organization_and_list_mine(client, auth_headers, test_user):
    resp = await client.post("/organizations/", json={"name": "Fresh Org"}, headers=auth_headers)
    assert resp.status_code == 201
    created = resp.json()
    assert created["name"] == "Fresh Org"

    mine = await client.get("/organizations/mine", headers=auth_headers)
    assert mine.status_code == 200
    orgs = mine.json()
    fresh = next(o for o in orgs if o["id"] == created["id"])
    assert fresh["name"] == "Fresh Org"
    assert len(fresh["members"]) == 1
    assert fresh["members"][0]["user_id"] == test_user.id
    assert fresh["members"][0]["role"] == "admin"


async def test_create_organization_requires_auth(client):
    resp = await client.post("/organizations/", json={"name": "No Auth Org"})
    assert resp.status_code == 401


async def test_create_organization_duplicate_name_rejected(client, auth_headers, test_org):
    resp = await client.post("/organizations/", json={"name": test_org.name}, headers=auth_headers)
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Organization name already exists"


async def test_mine_requires_auth(client):
    resp = await client.get("/organizations/mine")
    assert resp.status_code == 401


async def test_update_organization(client, auth_headers, test_org):
    resp = await client.patch(
        f"/organizations/{test_org.id}",
        json={"description": "Updated description"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["description"] == "Updated description"
    assert resp.json()["name"] == test_org.name


async def test_update_organization_requires_admin(client, auth_headers, second_user_headers, test_org):
    # second_user is not a member at all -> 403
    resp = await client.patch(
        f"/organizations/{test_org.id}", json={"description": "nope"}, headers=second_user_headers
    )
    assert resp.status_code == 403


async def test_update_organization_invalid_name_rejected(client, auth_headers, test_org):
    resp = await client.patch(
        f"/organizations/{test_org.id}", json={"name": "Bad!"}, headers=auth_headers
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Members
# ---------------------------------------------------------------------------
async def test_list_members_orders_admin_first(client, auth_headers, test_org, second_user, test_user):
    await client.post(
        f"/organizations/{test_org.id}/members/{second_user.id}", headers=auth_headers
    )
    resp = await client.get(f"/organizations/{test_org.id}/members", headers=auth_headers)
    assert resp.status_code == 200
    members = resp.json()
    assert len(members) == 2
    assert members[0]["user_id"] == test_user.id
    assert members[0]["role"] == "admin"
    assert members[1]["user_id"] == second_user.id
    assert members[1]["role"] == "user"


async def test_list_members_non_member_forbidden(client, auth_headers, second_user_headers, test_org):
    resp = await client.get(f"/organizations/{test_org.id}/members", headers=second_user_headers)
    assert resp.status_code == 403


async def test_add_member_by_admin(client, auth_headers, test_org, second_user):
    resp = await client.post(
        f"/organizations/{test_org.id}/members/{second_user.id}", headers=auth_headers
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == "user"
    assert resp.json()["user_id"] == second_user.id


async def test_add_member_duplicate_conflict(client, auth_headers, test_org, second_user):
    await client.post(f"/organizations/{test_org.id}/members/{second_user.id}", headers=auth_headers)
    resp = await client.post(f"/organizations/{test_org.id}/members/{second_user.id}", headers=auth_headers)
    assert resp.status_code == 409


async def test_add_member_by_non_admin_forbidden(client, auth_headers, second_user_headers, test_org, second_user, db_session):
    import tests.conftest as c

    third = c.make_user(db_session, "third@example.com", "Thirdpass123!")
    await client.post(f"/organizations/{test_org.id}/members/{second_user.id}", headers=auth_headers)
    resp = await client.post(
        f"/organizations/{test_org.id}/members/{third.id}", headers=second_user_headers
    )
    assert resp.status_code == 403


async def test_change_member_role_by_admin(client, auth_headers, test_org, second_user):
    await client.post(f"/organizations/{test_org.id}/members/{second_user.id}", headers=auth_headers)
    resp = await client.patch(
        f"/organizations/{test_org.id}/members/{second_user.id}",
        json={"role": "admin"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == "admin"


async def test_change_own_role_forbidden(client, auth_headers, test_org, test_user):
    resp = await client.patch(
        f"/organizations/{test_org.id}/members/{test_user.id}",
        json={"role": "user"},
        headers=auth_headers,
    )
    assert resp.status_code == 400


async def test_change_role_by_non_admin_forbidden(client, auth_headers, second_user_headers, test_org, second_user):
    await client.post(f"/organizations/{test_org.id}/members/{second_user.id}", headers=auth_headers)
    resp = await client.patch(
        f"/organizations/{test_org.id}/members/{second_user.id}",
        json={"role": "admin"},
        headers=second_user_headers,
    )
    assert resp.status_code == 403


async def test_remove_member_by_admin(client, auth_headers, test_org, second_user):
    await client.post(f"/organizations/{test_org.id}/members/{second_user.id}", headers=auth_headers)
    resp = await client.delete(
        f"/organizations/{test_org.id}/members/{second_user.id}", headers=auth_headers
    )
    assert resp.status_code == 200
    assert resp.json()["detail"] == "Member removed"

    members = (await client.get(f"/organizations/{test_org.id}/members", headers=auth_headers)).json()
    assert second_user.id not in [m["user_id"] for m in members]


async def test_remove_last_admin_forbidden(client, auth_headers, test_org, test_user):
    resp = await client.delete(
        f"/organizations/{test_org.id}/members/{test_user.id}", headers=auth_headers
    )
    assert resp.status_code == 400


async def test_remove_member_by_non_admin_forbidden(
    client, auth_headers, second_user_headers, test_org, second_user, db_session
):
    import tests.conftest as c

    third = c.make_user(db_session, "third-remove@example.com", "Thirdpass123!")
    await client.post(f"/organizations/{test_org.id}/members/{second_user.id}", headers=auth_headers)
    await client.post(f"/organizations/{test_org.id}/members/{third.id}", headers=auth_headers)
    resp = await client.delete(
        f"/organizations/{test_org.id}/members/{third.id}", headers=second_user_headers
    )
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Invites
# ---------------------------------------------------------------------------
async def test_invite_unregistered_email_creates_pending_member(client, auth_headers, test_org, db_session):
    resp = await client.post(
        f"/organizations/{test_org.id}/members",
        json={"email": "invitee@example.com", "role": "user"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["email"] == "invitee@example.com"
    assert body["status"] == "pending"

    membership = (
        db_session.query(OrganizationMember)
        .join(User, OrganizationMember.user_id == User.id)
        .filter(User.email == "invitee@example.com")
        .first()
    )
    assert membership.status == "pending"
    assert membership.invite_token is not None


async def test_invite_self_rejected(client, auth_headers, test_org, test_user):
    resp = await client.post(
        f"/organizations/{test_org.id}/members",
        json={"email": test_user.email, "role": "user"},
        headers=auth_headers,
    )
    assert resp.status_code == 400


async def test_invite_already_member_conflict(client, auth_headers, test_org, second_user, second_user_headers):
    await client.post(f"/organizations/{test_org.id}/members/{second_user.id}", headers=auth_headers)
    resp = await client.post(
        f"/organizations/{test_org.id}/members",
        json={"email": second_user.email, "role": "user"},
        headers=auth_headers,
    )
    assert resp.status_code == 409


async def test_invite_full_accept_flow(client, auth_headers, test_org, db_session):
    # admin invites an unregistered email
    await client.post(
        f"/organizations/{test_org.id}/members",
        json={"email": "invite-flow@example.com", "role": "user"},
        headers=auth_headers,
    )
    membership = (
        db_session.query(OrganizationMember)
        .join(User, OrganizationMember.user_id == User.id)
        .filter(User.email == "invite-flow@example.com")
        .first()
    )
    token = membership.invite_token

    # unauthenticated token lookup shows the invite info
    page = await client.get(f"/api/invite/{token}")
    assert page.status_code == 200
    assert page.json()["org_name"] == "Test Org"

    # invitee registers (activates the pending membership) and accepts
    reg = await client.post(
        "/auth/register", json={"email": "invite-flow@example.com", "password": "InviteFlow1!"}
    )
    assert reg.status_code == 201

    login = await client.post(
        "/auth/login",
        data={"username": "invite-flow@example.com", "password": "InviteFlow1!"},
    )
    invitee_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    accept = await client.post(f"/api/invite/{token}/accept", headers=invitee_headers)
    assert accept.status_code == 200
    assert accept.json()["status"] == "active"

    # token is consumed
    assert (await client.get(f"/api/invite/{token}")).status_code == 404


async def test_accept_invite_by_wrong_user_forbidden(client, auth_headers, second_user_headers, test_org, db_session):
    await client.post(
        f"/organizations/{test_org.id}/members",
        json={"email": "wrong-guy@example.com", "role": "user"},
        headers=auth_headers,
    )
    membership = (
        db_session.query(OrganizationMember)
        .join(User, OrganizationMember.user_id == User.id)
        .filter(User.email == "wrong-guy@example.com")
        .first()
    )
    token = membership.invite_token

    resp = await client.post(f"/api/invite/{token}/accept", headers=second_user_headers)
    assert resp.status_code == 403


async def test_reject_invite(client, auth_headers, test_org, db_session):
    await client.post(
        f"/organizations/{test_org.id}/members",
        json={"email": "reject-me@example.com", "role": "user"},
        headers=auth_headers,
    )
    membership = (
        db_session.query(OrganizationMember)
        .join(User, OrganizationMember.user_id == User.id)
        .filter(User.email == "reject-me@example.com")
        .first()
    )
    token = membership.invite_token

    reg = await client.post(
        "/auth/register", json={"email": "reject-me@example.com", "password": "RejectMe1!"}
    )
    assert reg.status_code == 201
    login = await client.post(
        "/auth/login", data={"username": "reject-me@example.com", "password": "RejectMe1!"}
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    resp = await client.post(f"/api/invite/{token}/reject", headers=headers)
    assert resp.status_code == 204

    remaining = (
        db_session.query(OrganizationMember)
        .join(User, OrganizationMember.user_id == User.id)
        .filter(User.email == "reject-me@example.com")
        .count()
    )
    assert remaining == 0
    assert (await client.get(f"/api/invite/{token}")).status_code == 404


# ---------------------------------------------------------------------------
# Org logo upload
# ---------------------------------------------------------------------------
async def test_upload_org_logo(client, auth_headers, test_org):
    resp = await client.post(
        f"/organizations/{test_org.id}/logo",
        headers=auth_headers,
        files={"file": ("logo.png", TINY_PNG, "image/png")},
    )
    assert resp.status_code == 200
    assert resp.json()["logo_url"].startswith("/uploads/")


async def test_upload_org_logo_rejects_wrong_type(client, auth_headers, test_org):
    resp = await client.post(
        f"/organizations/{test_org.id}/logo",
        headers=auth_headers,
        files={"file": ("logo.gif", b"GIF89a", "image/gif")},
    )
    assert resp.status_code == 400


async def test_upload_org_logo_rejects_oversize(client, auth_headers, test_org):
    resp = await client.post(
        f"/organizations/{test_org.id}/logo",
        headers=auth_headers,
        files={"file": ("huge.png", b"0" * (5 * 1024 * 1024 + 1), "image/png")},
    )
    assert resp.status_code == 400


async def test_upload_org_logo_requires_admin(client, second_user_headers, test_org):
    resp = await client.post(
        f"/organizations/{test_org.id}/logo",
        headers=second_user_headers,
        files={"file": ("logo.png", TINY_PNG, "image/png")},
    )
    assert resp.status_code == 403