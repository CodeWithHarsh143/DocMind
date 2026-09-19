"""Integration tests for chat session persistence."""

import uuid

from app.models.chats import ChatMessage, ChatSession


async def test_create_chat_session(client, auth_headers, test_org, test_user):
    resp = await client.post(
        f"/organizations/{test_org.id}/sessions",
        json={"title": "First chat"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["workspace_id"] == test_org.id
    assert data["owner_id"] == test_user.id
    assert data["title"] == "First chat"
    assert data["owner_name"] == test_user.name
    assert data["id"]


async def test_create_chat_session_default_title(client, auth_headers, test_org):
    resp = await client.post(
        f"/organizations/{test_org.id}/sessions", json={}, headers=auth_headers
    )
    assert resp.status_code == 201
    assert resp.json()["title"] == "New chat"


async def test_create_chat_session_non_member_forbidden(client, auth_headers, other_org):
    resp = await client.post(
        f"/organizations/{other_org.id}/sessions",
        json={"title": "Nope"},
        headers=auth_headers,
    )
    assert resp.status_code == 403


async def test_create_chat_session_requires_auth(client, test_org):
    resp = await client.post(f"/organizations/{test_org.id}/sessions", json={"title": "x"})
    assert resp.status_code == 401


async def test_list_chat_sessions(client, db_session, auth_headers, test_org, test_user):
    s1 = ChatSession(id=str(uuid.uuid4()), workspace_id=test_org.id, owner_id=test_user.id, title="Old")
    s2 = ChatSession(id=str(uuid.uuid4()), workspace_id=test_org.id, owner_id=test_user.id, title="New")
    db_session.add_all([s1, s2])
    db_session.commit()

    resp = await client.get(f"/organizations/{test_org.id}/sessions", headers=auth_headers)
    assert resp.status_code == 200
    sessions = resp.json()
    assert [s["id"] for s in sessions] == [s2.id, s1.id]


async def test_get_chat_messages_empty(client, auth_headers, test_org):
    created = await client.post(
        f"/organizations/{test_org.id}/sessions", json={}, headers=auth_headers
    )
    session_id = created.json()["id"]

    resp = await client.get(f"/sessions/{session_id}/messages", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


async def test_get_chat_messages_returns_message_with_user_info(client, db_session, auth_headers, test_org, test_user):
    session = ChatSession(id=str(uuid.uuid4()), workspace_id=test_org.id, owner_id=test_user.id)
    db_session.add(session)
    db_session.commit()

    msg = ChatMessage(
        id=str(uuid.uuid4()),
        session_id=session.id,
        content="What is DocMind?",
        role="user",
        user_id=test_user.id,
        sources=[{"page": 1}],
    )
    db_session.add(msg)
    db_session.commit()

    resp = await client.get(f"/sessions/{session.id}/messages", headers=auth_headers)
    assert resp.status_code == 200
    messages = resp.json()
    assert len(messages) == 1
    assert messages[0]["content"] == "What is DocMind?"
    assert messages[0]["role"] == "user"
    assert messages[0]["user_name"] == test_user.name
    assert messages[0]["sources"] == [{"page": 1}]


async def test_get_messages_requires_membership(client, db_session, auth_headers, other_org, second_user):
    session = ChatSession(id=str(uuid.uuid4()), workspace_id=other_org.id, owner_id=second_user.id)
    db_session.add(session)
    db_session.commit()

    resp = await client.get(f"/sessions/{session.id}/messages", headers=auth_headers)
    assert resp.status_code == 403


async def test_get_messages_session_not_found(client, auth_headers):
    resp = await client.get("/sessions/missing-session/messages", headers=auth_headers)
    assert resp.status_code == 404


async def test_delete_own_session(client, db_session, auth_headers, test_org, test_user):
    session = ChatSession(id=str(uuid.uuid4()), workspace_id=test_org.id, owner_id=test_user.id)
    db_session.add(session)
    db_session.commit()
    db_session.add(
        ChatMessage(
            id=str(uuid.uuid4()), session_id=session.id, content="x", role="user"
        )
    )
    db_session.commit()
    assert db_session.query(ChatMessage).filter(ChatMessage.session_id == session.id).count() == 1

    resp = await client.delete(f"/sessions/{session.id}", headers=auth_headers)
    assert resp.status_code == 204

    assert db_session.query(ChatSession).filter(ChatSession.id == session.id).count() == 0
    assert db_session.query(ChatMessage).filter(ChatMessage.session_id == session.id).count() == 0


async def test_delete_other_users_session_forbidden(client, db_session, auth_headers, other_org, second_user, second_user_headers):
    session = ChatSession(id=str(uuid.uuid4()), workspace_id=other_org.id, owner_id=second_user.id)
    db_session.add(session)
    db_session.commit()

    resp = await client.delete(f"/sessions/{session.id}", headers=auth_headers)
    assert resp.status_code == 403


async def test_delete_session_not_found(client, auth_headers):
    resp = await client.delete("/sessions/missing-session", headers=auth_headers)
    assert resp.status_code == 404