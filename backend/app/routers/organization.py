from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.organization import Organization, OrganizationMember, RoleEnum
from app.schemas.organization import (
    InviteMemberRequest,
    OrganizationCreate,
    OrganizationResponse,
    OrganizationMemberResponse,
    OrganizationUpdate,
    OrganizationWithMembersResponse,
    UpdateMemberRole,
)
from app.services.organization_service import OrganizationService


router = APIRouter(prefix="/organizations", tags=["Organizations"])


@router.post("/", response_model=OrganizationResponse, status_code=201)
def create_organization(
    organization_data: OrganizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_organization = OrganizationService.create(db, organization_data, current_user)
    return new_organization


@router.get("/mine", response_model=list[OrganizationWithMembersResponse])
def my_organizations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    memberships = (
        db.query(OrganizationMember)
        .filter(OrganizationMember.user_id == current_user.id)
        .all()
    )
    organizations = []
    for membership in memberships:
        org = (
            db.query(Organization)
            .filter(Organization.id == membership.organization_id)
            .first()
        )
        if org is None:
            continue
        organizations.append(
            {
                "id": org.id,
                "name": org.name,
                "description": org.description,
                "logo_url": org.logo_url,
                "created_at": org.created_at,
                "members": [OrganizationService._member_dict(db, membership)],
            }
        )
    return organizations


@router.post("/{org_id}/members/{user_id}", response_model=OrganizationMemberResponse)
def add_member(
    org_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    role: RoleEnum = RoleEnum.USER,
):
    OrganizationService.require_admin(db, org_id, current_user.id)
    return OrganizationService.add_member(db, org_id, user_id, role)


@router.post("/{org_id}/members", response_model=OrganizationMemberResponse)
def invite_member(
    org_id: int,
    invite_data: InviteMemberRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    OrganizationService.require_admin(db, org_id, current_user.id)
    return OrganizationService.invite_member(
        db, org_id, invite_data.email, invite_data.role, current_user
    )


@router.get("/{org_id}/members", response_model=list[OrganizationMemberResponse])
def list_members(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    OrganizationService.required_membership(db, org_id, current_user.id)
    return OrganizationService.list_members(db, org_id)


@router.patch("/{org_id}/members/{user_id}", response_model=OrganizationMemberResponse)
def change_member_role(
    org_id: int,
    user_id: int,
    role_data: UpdateMemberRole,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    OrganizationService.require_admin(db, org_id, current_user.id)
    return OrganizationService.change_member_role(
        db, org_id, user_id, role_data.role, current_user
    )


@router.delete("/{org_id}/members/{user_id}")
def remove_member(
    org_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if user_id == current_user.id:
        OrganizationService.required_membership(db, org_id, current_user.id)
    else:
        OrganizationService.require_admin(db, org_id, current_user.id)
    OrganizationService.remove_member(db, org_id, user_id, current_user)
    return {"detail": "Member removed"}


@router.patch("/{org_id}", response_model=OrganizationResponse)
def update_organization(
    org_id: int,
    update_data: OrganizationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    OrganizationService.require_admin(db, org_id, current_user.id)
    return OrganizationService.update_organization(db, org_id, update_data)
