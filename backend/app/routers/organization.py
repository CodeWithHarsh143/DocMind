import aiofiles
import logging
import os
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
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
from app.services.email_service import EmailService

logger = logging.getLogger(__name__)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
IMAGE_EXTENSIONS = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB

UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "storage", "uploads"
)
os.makedirs(UPLOAD_DIR, exist_ok=True)


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
    placeholder_membership: dict = OrganizationService.invite_member(
        db, org_id, invite_data.email, invite_data.role, current_user
    )
    if placeholder_membership.invited_token:
        try:
            EmailService.send_invite_email(
                to=placeholder_membership.email,
                org_name=placeholder_membership.organization_name,
                inviter_name=current_user.name or current_user.email,
                invite_token=placeholder_membership.invited_token,
            )
        except Exception:
            # Membership is persisted; a failed notification must not break the invite.
            logger.info(
                "Invite email failed to send to %s",
                placeholder_membership.email,
                exc_info=True,
            )
    return placeholder_membership


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


@router.post("/{org_id}/logo")
async def upload_org_logo(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    file: UploadFile = File(...),
):
    OrganizationService.require_admin(db, org_id, current_user.id)

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="PNG, JPG or WebP up to 5MB.")

    extension = IMAGE_EXTENSIONS[file.content_type]
    unique_name = f"{uuid.uuid4()}{extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)

    file_size = 0
    async with aiofiles.open(file_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):
            file_size += len(chunk)
            if file_size > MAX_IMAGE_SIZE:
                await f.close()
                os.remove(file_path)
                raise HTTPException(
                    status_code=400, detail="PNG, JPG or WebP up to 5MB."
                )
            await f.write(chunk)

    organization = db.query(Organization).filter(Organization.id == org_id).first()
    if not organization:
        os.remove(file_path)
        raise HTTPException(status_code=404, detail="Organization not found")

    organization.logo_url = f"/uploads/{unique_name}"
    db.commit()
    db.refresh(organization)
    return {"logo_url": organization.logo_url}
