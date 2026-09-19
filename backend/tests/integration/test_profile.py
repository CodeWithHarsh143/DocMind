"""Integration tests for user profile update and avatar upload."""

import base64

TINY_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUB"
    "AScY42YAAAAASUVORK5CYII="
)


async def test_update_profile_success(client, auth_headers):
    resp = await client.patch(
        "/users/me/profile",
        json={"name": "Grace Hopper", "phone": "+1 (555) 123-4567"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Grace Hopper"
    assert data["phone"] == "+1 (555) 123-4567"


async def test_update_profile_partial(client, auth_headers, test_user):
    resp = await client.patch("/users/me/profile", json={"phone": "5551234567"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == test_user.name
    assert resp.json()["phone"] == "5551234567"


async def test_update_profile_rejects_invalid_name(client, auth_headers):
    resp = await client.patch("/users/me/profile", json={"name": "Grace2"}, headers=auth_headers)
    assert resp.status_code == 422


async def test_update_profile_rejects_invalid_phone(client, auth_headers):
    resp = await client.patch("/users/me/profile", json={"phone": "123"}, headers=auth_headers)
    assert resp.status_code == 422


async def test_update_profile_requires_auth(client):
    resp = await client.patch("/users/me/profile", json={"name": "X"})
    assert resp.status_code == 401


async def test_upload_avatar(client, auth_headers):
    resp = await client.post(
        "/users/me/avatar",
        headers=auth_headers,
        files={"file": ("me.png", TINY_PNG, "image/png")},
    )
    assert resp.status_code == 200
    avatar_url = resp.json()["avatar_url"]
    assert avatar_url.startswith("/uploads/")

    me = await client.get("/auth/me", headers=auth_headers)
    assert me.json()["avatar_url"] == avatar_url


async def test_upload_avatar_rejects_wrong_type(client, auth_headers):
    resp = await client.post(
        "/users/me/avatar",
        headers=auth_headers,
        files={"file": ("me.txt", b"plain text", "text/plain")},
    )
    assert resp.status_code == 400


async def test_upload_avatar_rejects_oversize(client, auth_headers):
    resp = await client.post(
        "/users/me/avatar",
        headers=auth_headers,
        files={"file": ("huge.png", b"0" * (5 * 1024 * 1024 + 1), "image/png")},
    )
    assert resp.status_code == 400


async def test_upload_avatar_requires_auth(client):
    resp = await client.post(
        "/users/me/avatar", files={"file": ("me.png", TINY_PNG, "image/png")}
    )
    assert resp.status_code == 401