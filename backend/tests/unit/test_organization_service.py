"""Unit tests for OrganizationService business rules."""

import pytest
from fastapi import HTTPException

from app.core.exceptions import (
    AlreadyMemberException,
    MemberNotFoundException,
    NonRemoveAbleException,
    NotAMemberException,
    NotAnAdminException,
    YourAreAlreadyAMemberException,
)
from app.models.organization import Organization, OrganizationMember, RoleEnum
from app.models.user import User
from app.schemas.organization import OrganizationCreate, OrganizationUpdate
from app.services.organization_service import OrganizationService


@pytest.fixture
def unregistered_user(db_session):
    u = User(email="ghost@example.com", hashed_password=None)
    db_session.add(u)
    db_session.commit()
    db_session.refresh(u)
    return u


def test_create_org_makes_creator_admin(db_session, test_user):
    org = OrganizationService.create(
        db=db_session,
        org_data=OrganizationCreate(name="Brand New Org"),
        current_user=test_user,
    )

    assert org.id is not None
    membership = OrganizationService.is_member(
        db=db_session, organization_id=org.id, user_id=test_user.id
    )
    assert membership is not None
    assert membership.role == RoleEnum.ADMIN


def test_create_org_duplicate_name_raises(db_session, test_user):
    OrganizationService.create(
        db=db_session,
        org_data=OrganizationCreate(name="Duplicate Org"),
        current_user=test_user,
    )
    with pytest.raises(HTTPException) as exc_info:
        OrganizationService.create(
            db=db_session,
            org_data=OrganizationCreate(name="Duplicate Org"),
            current_user=test_user,
        )
    assert exc_info.value.status_code == 400


def test_required_membership_non_member_raises(db_session, test_org, test_user):
    outsider = User(email="outsider@example.com")
    db_session.add(outsider)
    db_session.commit()

    with pytest.raises(NotAMemberException):
        OrganizationService.required_membership(
            db=db_session, organization_id=test_org.id, user_id=outsider.id
        )


def test_require_admin_member_with_user_role_raises(db_session, test_org, test_user, second_user):
    OrganizationService.add_member(
        db=db_session, organization_id=test_org.id, user_id=second_user.id
    )

    with pytest.raises(NotAnAdminException):
        OrganizationService.require_admin(
            db=db_session, organization_id=test_org.id, user_id=second_user.id
        )


def test_require_admin_non_member_raises(db_session, test_org, test_user):
    outsider = User(email="outsider2@example.com")
    db_session.add(outsider)
    db_session.commit()

    with pytest.raises(NotAMemberException):
        OrganizationService.require_admin(
            db=db_session, organization_id=test_org.id, user_id=outsider.id
        )


def test_require_admin_admin_passes(db_session, test_org, test_user):
    membership = OrganizationService.require_admin(
        db=db_session, organization_id=test_org.id, user_id=test_user.id
    )
    assert membership.role == RoleEnum.ADMIN


def test_add_member_creates_membership(db_session, test_org, test_user, second_user):
    membership = OrganizationService.add_member(
        db=db_session,
        organization_id=test_org.id,
        user_id=second_user.id,
        role=RoleEnum.USER,
    )
    assert membership.user_id == second_user.id
    assert membership.role == RoleEnum.USER


def test_add_member_duplicate_raises(db_session, test_org, test_user, second_user):
    OrganizationService.add_member(
        db=db_session, organization_id=test_org.id, user_id=second_user.id
    )
    with pytest.raises(AlreadyMemberException):
        OrganizationService.add_member(
            db=db_session, organization_id=test_org.id, user_id=second_user.id
        )


def test_invite_unregistered_email_creates_pending(db_session, test_org, test_user):
    result = OrganizationService.invite_member(
        db=db_session,
        organization_id=test_org.id,
        email="Invitee.Example.com ",
        role="user",
        current_user=test_user,
    )

    assert result["status"] == "pending"
    assert result["email"] == "invitee.example.com"
    assert result["invited_token"] is not None

    user = db_session.query(User).filter(User.email == "invitee.example.com").first()
    assert user is not None
    assert user.hashed_password is None
    membership = OrganizationService.is_member(db=db_session, organization_id=test_org.id, user_id=user.id)
    assert membership.status == "pending"


def test_invite_existing_active_user_is_active(db_session, test_org, test_user, second_user):
    result = OrganizationService.invite_member(
        db=db_session,
        organization_id=test_org.id,
        email=second_user.email,
        role="user",
        current_user=test_user,
    )
    assert result["status"] == "active"
    assert result["invited_token"] is None
    assert result["email"] == second_user.email


def test_invite_self_raises(db_session, test_org, test_user):
    with pytest.raises(YourAreAlreadyAMemberException):
        OrganizationService.invite_member(
            db=db_session,
            organization_id=test_org.id,
            email=test_user.email,
            role="user",
            current_user=test_user,
        )


def test_invite_already_member_raises(db_session, test_org, test_user, second_user):
    OrganizationService.add_member(
        db=db_session, organization_id=test_org.id, user_id=second_user.id
    )
    with pytest.raises(AlreadyMemberException):
        OrganizationService.invite_member(
            db=db_session,
            organization_id=test_org.id,
            email=second_user.email,
            role="user",
            current_user=test_user,
        )


def test_change_member_role_user_to_admin(db_session, test_org, test_user, second_user):
    OrganizationService.add_member(
        db=db_session, organization_id=test_org.id, user_id=second_user.id
    )
    updated = OrganizationService.change_member_role(
        db=db_session,
        organization_id=test_org.id,
        target_user_id=second_user.id,
        role=RoleEnum.ADMIN,
        current_user=test_user,
    )
    assert updated["role"] == RoleEnum.ADMIN


def test_change_own_role_raises(db_session, test_org, test_user):
    with pytest.raises(NonRemoveAbleException):
        OrganizationService.change_member_role(
            db=db_session,
            organization_id=test_org.id,
            target_user_id=test_user.id,
            role=RoleEnum.USER,
            current_user=test_user,
        )


def test_change_last_admin_role_raises(db_session, test_org, test_user, second_user):
    # test_user is the only admin; second_user (a plain member) attempts the change.
    OrganizationService.add_member(
        db=db_session, organization_id=test_org.id, user_id=second_user.id
    )
    with pytest.raises(NonRemoveAbleException):
        OrganizationService.change_member_role(
            db=db_session,
            organization_id=test_org.id,
            target_user_id=test_user.id,
            role=RoleEnum.USER,
            current_user=second_user,
        )


def test_change_member_role_missing_member_raises(db_session, test_org, test_user, unregistered_user):
    with pytest.raises(MemberNotFoundException):
        OrganizationService.change_member_role(
            db=db_session,
            organization_id=test_org.id,
            target_user_id=unregistered_user.id,
            role=RoleEnum.USER,
            current_user=test_user,
        )


def test_remove_member_deletes_membership(db_session, test_org, test_user, second_user):
    OrganizationService.add_member(
        db=db_session, organization_id=test_org.id, user_id=second_user.id
    )
    OrganizationService.remove_member(
        db=db_session,
        organization_id=test_org.id,
        target_user_id=second_user.id,
        current_user=test_user,
    )
    assert (
        OrganizationService.is_member(
            db=db_session, organization_id=test_org.id, user_id=second_user.id
        )
        is None
    )


def test_remove_last_admin_raises(db_session, test_org, test_user):
    with pytest.raises(NonRemoveAbleException):
        OrganizationService.remove_member(
            db=db_session,
            organization_id=test_org.id,
            target_user_id=test_user.id,
            current_user=test_user,
        )


def test_list_members_orders_admins_first(db_session, test_org, test_user, second_user):
    OrganizationService.add_member(
        db=db_session, organization_id=test_org.id, user_id=second_user.id
    )
    members = OrganizationService.list_members(db=db_session, organization_id=test_org.id)

    assert len(members) == 2
    assert members[0]["user_id"] == test_user.id
    assert members[0]["role"] == RoleEnum.ADMIN
    assert members[1]["role"] == RoleEnum.USER


def test_update_organization_partial(db_session, test_org, test_user):
    updated = OrganizationService.update_organization(
        db=db_session,
        organization_id=test_org.id,
        update_data=OrganizationUpdate(description="A new description"),
    )
    assert updated.description == "A new description"
    assert updated.name == test_org.name


def test_update_organization_not_found(db_session, test_user):
    with pytest.raises(HTTPException) as exc_info:
        OrganizationService.update_organization(
            db=db_session,
            organization_id=999999,
            update_data=OrganizationUpdate(name="Valid Name"),
        )
    assert exc_info.value.status_code == 404


def test_update_organization_duplicate_name_raises(db_session, test_user, test_org):
    other = Organization(name="Other Org For Dup")
    db_session.add(other)
    db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        OrganizationService.update_organization(
            db=db_session,
            organization_id=test_org.id,
            update_data=OrganizationUpdate(name="Other Org For Dup"),
        )
    assert exc_info.value.status_code == 400