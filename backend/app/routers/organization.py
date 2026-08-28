from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.organization import Organization, OrganizationMember, RoleEnum
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationResponse,
    OrganizationMemberResponse,
    OrganizationWithMembersResponse,
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
                "created_at": org.created_at,
                "members": [
                    {
                        "id": membership.id,
                        "user_id": membership.user_id,
                        "organization_id": membership.organization_id,
                        "role": membership.role,
                    }
                ],
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
