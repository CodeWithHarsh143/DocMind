"""Validation of the shared test harness itself.

These guard the two most important infrastructure guarantees:
  1. the app is wired to the test schema, and
  2. a committed write inside one test is rolled back before the next one.
"""

from app.models.user import User


async def test_client_is_wired_to_app(client):
    resp = await client.get("/")
    assert resp.status_code == 200
    assert resp.json()["message"] == "Welcome to the FastAPI application!"


def test_writes_committed_inside_a_test_are_rolled_back(db_session):
    db_session.add(User(email="rolled-back@example.com", name="Ghost"))
    db_session.commit()


def test_previous_test_data_is_gone(db_session, test_user):
    assert db_session.query(User).filter(User.email == "rolled-back@example.com").count() == 0
    assert db_session.query(User).filter(User.email == test_user.email).count() == 1