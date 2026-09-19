"""Unit tests for InviteService."""

import pytest
from fastapi import HTTPException

from app.models.organization import OrganizationMember
from app.models.user import User
from app.services.invite_service import InviteService
from app.services.organization_service import OrganizationService


@pytest.fixture
def invitee(db_session, test_org, test_user):
    result = OrganizationService.invite_member(
        db=db_session,
        organization_id=test_org.id,
        email="invite-svc@example.com",
        role="user",
        current_user=test_user,
    )
    user = db_session.query(User).filter(User.email == "invite-svc@example.com").first()
    return user, result["invited_token"]


def test_get_invite_by_token_returns_info(db_session, invitee):
    user, token = invitee
    info = InviteService.get_invite_by_token(db=db_session, invite_token=token)
    assert info["org_name"] == "Test Org"
    assert info["invited_email"] == "invite-svc@example.com"
    assert info["status"] == "pending"
    assert info["token"] == token


def test_get_invite_by_token_missing_raises(db_session):
    with pytest.raises(HTTPException) as exc_info:
        InviteService.get_invite_by_token(db=db_session, invite_token="nope")
    assert exc_info.value.status_code == 404


def test_accept_invite_by_owner_activates(db_session, invitee, test_org):
    user, token = invitee
    membership = InviteService.accept_invite(
        db=db_session, current_user_id=user.id, invite_token=token
    )
    assert membership.status == "active"
    assert membership.invite_token is None


def test_accept_invite_by_wrong_user_raises(db_session, invitee, second_user):
    _, token = invitee
    with pytest.raises(HTTPException) as exc_info:
        InviteService.accept_invite(
            db=db_session, current_user_id=second_user.id, invite_token=token
        )
    assert exc_info.value.status_code == 403


def test_reject_invite_deletes_membership(db_session, invitee, test_org):
    user, token = invitee
    InviteService.reject_invite(
        db=db_session, invite_token=token, current_user_id=user.id
    )
    remaining = (
        db_session.query(OrganizationMember)
        .filter(
            OrganizationMember.user_id == user.id,
            OrganizationMember.organization_id == test_org.id,
        )
        .all()
    )
    assert remaining == []


def test_reject_invite_by_wrong_user_raises(db_session, invitee, second_user):
    _, token = invitee
    with pytest.raises(HTTPException) as exc_info:
        InviteService.reject_invite(
            db=db_session, invite_token=token, current_user_id=second_user.id
        )
    assert exc_info.value.status_code == 403


def test_list_pending_returns_only_my_invites(db_session, invitee, test_org, second_user):
    user, token = invitee
    # Second pending invite for the same invitee, from a different org.
    org2 = test_org  # reuse
    from app.models.organization import Organization, OrganizationMember

    other = Organization(name="Another Org")
    db_session.add(other)
    db_session.commit()
    db_session.add(
        OrganizationMember(
            user_id=user.id,
            organization_id=other.id,
            role="user",
            status="pending",
            invite_token="second-token",
        )
    )
    db_session.commit()

    pending = InviteService.list_pending(db=db_session, current_user_id=user.id)
    assert len(pending) == 2
    assert {p["org_name"] for p in pending} == {"Test Org", "Another Org"}


def test_list_pending_empty_for_other_user(db_session, invitee, second_user):
    assert InviteService.list_pending(db=db_session, current_user_id=second_user.id) == []