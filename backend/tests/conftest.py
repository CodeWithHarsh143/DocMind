"""Shared fixtures for the DocMind backend test-suite.

Prerequisites
-------------
* Service/integration tests need a running PostgreSQL server (role able to
  ``CREATE SCHEMA``, ``vector`` extension available) and a running Redis
  server. Pure unit tests (cache via fakeredis, schemas, security, email) run
  without either.
* Defaults are the local dev stack (``docmind1234``/``docmind123`` at
  ``localhost``, schema ``docmind_test``, Redis db 1). Override them so the
  suite can run anywhere::

    TEST_BASE_DATABASE_URL=postgresql://user:pass@host:5432/docmind
    TEST_SCHEMA=my_test_schema
    TEST_REDIS_URL=redis://localhost:6379/15
    SECRET_KEY=anything-unique

Run from ``backend/`` with the project venv (a plain ``pytest`` may resolve
to a different interpreter that lacks the dependencies)::

    .venv/bin/python -m pytest            # whole suite
    .venv/bin/python -m pytest unit/      # unit tests only

Environment pinning
-------------------
The very first thing this module does (before any ``app`` import) is to force
the application to use a dedicated test schema and a dedicated Redis
database. Real environment variables always win over the values loaded from
``backend/.env`` by pydantic-settings, so the dev/prod data is never touched.

Database strategy
-----------------
Test data lives in its own PostgreSQL schema (``docmind_test``), selected via
the connection's ``search_path``. The DB role lacks ``CREATEDB``, so a
separate test database cannot be created automatically; a dedicated schema
gives the same isolation without special privileges.

Schema is created with ``Base.metadata.create_all`` (the app itself already
creates it on import in ``app.main``). Each test runs inside its own
transaction on a shared ``db_session``; the ``Session`` is bound to a
connection with an outer transaction using ``join_transaction_mode="create_savepoint"``
so ``db.commit()`` inside service/router code is translated to SAVEPOINT
RELEASES instead of real COMMITs. At teardown we roll back the outer
transaction, which discards every write made by the test.
"""

import os
from datetime import datetime, timedelta, timezone

import fakeredis
import httpx
import psycopg2
import pytest
import types
from redis import Redis
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session
from sqlalchemy.pool import NullPool

# Isolated PostgreSQL schema (the DB role is not allowed to create databases,
# so we isolate test data in a dedicated schema set via the connection's
# search_path; the dev ``public`` schema is never touched).
TEST_BASE_DATABASE_URL = os.environ.get(
    "TEST_BASE_DATABASE_URL",
    "postgresql://docmind1234:docmind123@localhost:5432/docmind",
)
TEST_SCHEMA = os.environ.get("TEST_SCHEMA", "docmind_test")
# search_path puts the test schema first (shadowing dev tables) and falls back
# to public so the pgvector "vector" type (installed there) still resolves.
TEST_DATABASE_URL = (
    f"{TEST_BASE_DATABASE_URL}?options=-csearch_path%3D{TEST_SCHEMA}%2Cpublic"
)
TEST_REDIS_URL = os.environ.get("TEST_REDIS_URL", "redis://localhost:6379/1")

# --- Pin the app to test infrastructure before any app import -------------
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ["REDIS_URL"] = TEST_REDIS_URL
os.environ["SECRET_KEY"] = os.environ.get(
    "TEST_SECRET_KEY", "test-secret-key-for-docmind-test-suite"
)
os.environ["EXPIRE_MINUTES"] = "30"
os.environ["ALGORITHM"] = "HS256"
# Deterministic OAuth audience so Google-token tests don't depend on .env.
os.environ[
    "GOOGLE_CLIENT_ID"
] = "test-google-client-id.apps.googleusercontent.com"
# Keep email delivery offline: an SMTP config without host/credentials raises
# immediately inside EmailService, and the OTP router falls back to logging.
os.environ["EMAIL_PROVIDER"] = os.environ.get("TEST_EMAIL_PROVIDER", "smtp")
os.environ["SMTP_HOST"] = ""
os.environ["SMTP_USER"] = ""
os.environ["SMTP_PASS"] = ""


def _admin_connection(dbname: str):
    url = make_url(TEST_BASE_DATABASE_URL)
    return psycopg2.connect(
        host=url.host,
        port=url.port or 5432,
        user=url.username,
        password=url.password,
        dbname=dbname,
    )


def _ensure_test_schema() -> None:
    url = make_url(TEST_BASE_DATABASE_URL)
    conn = _admin_connection(url.database)
    conn.autocommit = True
    cur = conn.cursor()
    # The DocumentChunk model uses pgvector's vector type; the extension is
    # per-database so make sure it exists (idempotent).
    cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
    cur.execute(f'DROP SCHEMA IF EXISTS "{TEST_SCHEMA}" CASCADE')
    cur.execute(f'CREATE SCHEMA "{TEST_SCHEMA}"')
    conn.close()


@pytest.fixture(scope="session")
def _test_database_setup():
    """Create the test schema/tables once per session and wipe Redis.

    Deliberately *not* autouse: it is only requested through ``test_engine``,
    which only ``db_session``/``client`` depend on. Pure unit tests (schemas,
    cache via fakeredis, security, email) therefore run without a live
    Postgres/Redis.
    """
    _ensure_test_schema()

    # Importing app.main builds the app and runs Base.metadata.create_all
    # against the (test) engine configured by DATABASE_URL above.
    import app.main  # noqa: F401
    from app.database import Base

    engine = create_engine(TEST_DATABASE_URL, poolclass=NullPool)
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    engine.dispose()

    redis = Redis.from_url(TEST_REDIS_URL)
    redis.flushdb()

    yield

    redis.flushdb()


@pytest.fixture(scope="session")
def test_engine(_test_database_setup):
    engine = create_engine(TEST_DATABASE_URL, poolclass=NullPool)
    yield engine
    engine.dispose()


@pytest.fixture
def db_session(test_engine):
    """Transactional session: everything is rolled back after the test."""
    connection = test_engine.connect()
    transaction = connection.begin()
    session = Session(
        bind=connection, join_transaction_mode="create_savepoint"
    )
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
async def client(db_session):
    """httpx.AsyncClient wired to the FastAPI app with the test transaction."""
    from app.database import get_db
    from app.main import app

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=True)
    async with httpx.AsyncClient(
        transport=transport, base_url="http://test"
    ) as c:
        yield c
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Seed fixtures
# ---------------------------------------------------------------------------
@pytest.fixture
def test_user(db_session):
    from app.core.security import hash_password
    from app.models.user import User

    user = User(
        email="testuser@example.com",
        hashed_password=hash_password("Testpass123!"),
        name="Test User",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user):
    from app.core.security import create_access_token

    token = create_access_token({"sub": str(test_user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def second_user(db_session):
    from app.core.security import hash_password
    from app.models.user import User

    user = User(
        email="second@example.com",
        hashed_password=hash_password("Secondpass123!"),
        name="Second User",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def second_user_headers(second_user):
    from app.core.security import create_access_token

    token = create_access_token({"sub": str(second_user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def test_org(db_session, test_user):
    """An organization with test_user as its (single) admin."""
    from app.models.organization import Organization, OrganizationMember, RoleEnum

    org = Organization(name="Test Org")
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)
    membership = OrganizationMember(
        user_id=test_user.id,
        organization_id=org.id,
        role=RoleEnum.ADMIN,
    )
    db_session.add(membership)
    db_session.commit()
    return org


# ---------------------------------------------------------------------------
# Redis fixtures
# ---------------------------------------------------------------------------
@pytest.fixture
def fake_redis(monkeypatch):
    """An in-memory Redis replacement for unit tests."""
    r = fakeredis.FakeRedis()
    return r


@pytest.fixture
def fake_cache_redis(monkeypatch, fake_redis):
    """Point cache_service at fakeredis for unit tests."""
    monkeypatch.setattr("app.services.cache_service.redis_conn", fake_redis)
    return fake_redis


@pytest.fixture
def otp_redis():
    """Real Redis test instance; otp:* keys are cleaned up after the test."""
    r = Redis.from_url(TEST_REDIS_URL, decode_responses=True)
    yield r
    keys = r.keys("otp:*")
    if keys:
        r.delete(*keys)


@pytest.fixture
def mock_otp_email(monkeypatch):
    """Capture OTP codes sent by request-otp instead of sending real email."""
    sent = {}

    def fake_send(to, code):
        sent[to] = code

    monkeypatch.setattr(
        "app.services.email_service.EmailService.send_otp_email",
        staticmethod(fake_send),
    )
    return sent


@pytest.fixture
def sync_queue():
    """RQ queue in synchronous mode: jobs run inline, no worker needed."""
    from rq import Queue

    queue = Queue(
        name="test-sync",
        connection=Redis.from_url(TEST_REDIS_URL),
        is_async=False,
    )
    yield queue
    queue.empty()


@pytest.fixture
def mock_google_tokeninfo(monkeypatch):
    """Control the Google tokeninfo response used by /auth/google.

    Pass either a payload dict or an Exception instance to raise.
    """

    def set_response(payload, status_code: int = 200):
        if isinstance(payload, Exception):

            def fake_get(*args, **kwargs):
                raise payload

        else:
            resp = types.SimpleNamespace(
                status_code=status_code, json=lambda: payload
            )

            def fake_get(*args, **kwargs):
                return resp

        monkeypatch.setattr("app.routers.auth.httpx.get", fake_get)

    return set_response


@pytest.fixture
def other_org(db_session, second_user):
    """An organization the main test_user is NOT a member of."""
    from app.models.organization import Organization, OrganizationMember, RoleEnum

    org = Organization(name="Other Org")
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)
    db_session.add(
        OrganizationMember(
            user_id=second_user.id,
            organization_id=org.id,
            role=RoleEnum.ADMIN,
        )
    )
    db_session.commit()
    return org


# ---------------------------------------------------------------------------
# Tiny test helpers
# ---------------------------------------------------------------------------
def make_user(
    db: Session, email: str, password: str | None = "Password123!", **kwargs
):
    """Create a User row in the given session."""
    from app.core.security import hash_password
    from app.models.user import User

    user = User(
        email=email,
        hashed_password=hash_password(password) if password else None,
        **kwargs,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def make_org_member(
    db: Session, org, user, role="user", status="active", invite_token=None
):
    from app.models.organization import OrganizationMember

    member = OrganizationMember(
        user_id=user.id,
        organization_id=org.id,
        role=role,
        status=status,
        invite_token=invite_token,
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


def expired_datetime(**delta):
    return datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(**delta)