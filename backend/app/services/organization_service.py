from sqlalchemy import case
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from app.models.organization import Organization, OrganizationMember, RoleEnum
from app.models.user import User
from app.schemas.organization import OrganizationCreate, OrganizationUpdate
from app.core.exceptions import (
    NonRemoveAbleException,
    NotAMemberException,
    NotAnAdminException,
    AlreadyMemberException,
    MemberNotFoundException,
    YourAreAlreadyAMemberException,
)
import secrets


class OrganizationService:
    @staticmethod
    def create(
        db: Session, org_data: OrganizationCreate, current_user: User
    ) -> Organization | None:
        new_org = Organization(name=org_data.name)
        db.add(new_org)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=400, detail="Organization name already exists"
            )
        db.refresh(new_org)

        membership = OrganizationMember(
            user_id=current_user.id, organization_id=new_org.id, role=RoleEnum.ADMIN
        )

        db.add(membership)
        db.commit()
        return new_org

    @staticmethod
    def is_member(
        db: Session, organization_id: int, user_id: int
    ) -> OrganizationMember | None:
        return (
            db.query(OrganizationMember)
            .filter(
                OrganizationMember.user_id == user_id,
                OrganizationMember.organization_id == organization_id,
            )
            .first()
        )

    @staticmethod
    def required_membership(
        db: Session, organization_id: int, user_id: int
    ) -> OrganizationMember:
        membership = OrganizationService.is_member(db, organization_id, user_id)
        if membership is None:
            raise NotAMemberException()
        return membership

    @staticmethod
    def require_admin(
        db: Session, organization_id: int, user_id: int
    ) -> OrganizationMember:
        membership = OrganizationService.is_member(db, organization_id, user_id)
        if membership is None:
            raise NotAMemberException()
        if membership.role != RoleEnum.ADMIN:
            raise NotAnAdminException()
        return membership

    @staticmethod
    def add_member(
        db: Session,
        organization_id: int,
        user_id: int,
        role: RoleEnum = RoleEnum.USER,
    ):
        already = OrganizationService.is_member(db, organization_id, user_id)

        if already is not None:
            raise AlreadyMemberException()
        membership = OrganizationMember(
            user_id=user_id, organization_id=organization_id, role=role
        )

        db.add(membership)
        db.commit()
        db.refresh(membership)
        return membership

    @staticmethod
    def invite_member(
        db: Session, organization_id: int, email: str, role: str, current_user: User
    ):
        email: str = email.lower().strip()
        if email == current_user.email:
            raise YourAreAlreadyAMemberException()
        invited_user: User = db.query(User).filter(User.email == email).first()
        if invited_user and OrganizationService.is_member(
            db, organization_id, invited_user.id
        ):
            raise AlreadyMemberException()
        status: str = ""
        if not invited_user:
            invited_user = User(email=email, hashed_password=None)
            db.add(invited_user)
            db.flush()
            status = "pending"
        else:
            status = "active"
        membership = OrganizationMember(
            user_id=invited_user.id,
            organization_id=organization_id,
            role=role,
            status=status,
            invite_token=(
                secrets.token_urlsafe(32) if status == "pending" else None
            ),
            invited_by=current_user.id,
        )
        db.add(membership)
        db.commit()
        return OrganizationService._member_dict(db, membership)

    @staticmethod
    def _member_dict(db: Session, membership: OrganizationMember) -> dict:
        user = db.query(User).filter(User.id == membership.user_id).first()
        return {
            "id": membership.id,
            "user_id": membership.user_id,
            "role": membership.role,
            "status": membership.status,
            "email": user.email if user else None,
            "name": user.name if user else None,
            "avatar_url": user.avatar_url if user else None,
            "joined_at": membership.joined_at,
            "invited_token": membership.invite_token,
            "invited_by": membership.invited_by or None,
            "invited_at": membership.invited_at or None,
            "organization_name": membership.organization.name,
        }

    @staticmethod
    def get_member_or_404(
        db: Session, organization_id: int, user_id: int
    ) -> OrganizationMember:
        membership = OrganizationService.is_member(db, organization_id, user_id)
        if membership is None:
            raise MemberNotFoundException()
        return membership

    @staticmethod
    def _is_last_admin(db: Session, organization_id: int) -> bool:
        admin_count = (
            db.query(OrganizationMember)
            .filter(
                OrganizationMember.organization_id == organization_id,
                OrganizationMember.role == RoleEnum.ADMIN,
            )
            .count()
        )
        return admin_count <= 1

    @staticmethod
    def change_member_role(
        db: Session,
        organization_id: int,
        target_user_id: int,
        role: RoleEnum,
        current_user: User,
    ) -> dict:
        membership = OrganizationService.get_member_or_404(
            db, organization_id, target_user_id
        )
        if membership.user_id == current_user.id:
            raise NonRemoveAbleException("You cannot change your own role.")
        if membership.role == RoleEnum.ADMIN and OrganizationService._is_last_admin(
            db, organization_id
        ):
            raise NonRemoveAbleException("The last admin cannot be demoted.")
        membership.role = role
        db.commit()
        db.refresh(membership)
        return OrganizationService._member_dict(db, membership)

    @staticmethod
    def remove_member(
        db: Session, organization_id: int, target_user_id: int, current_user: User
    ):
        membership = OrganizationService.get_member_or_404(
            db, organization_id, target_user_id
        )
        if membership.role == RoleEnum.ADMIN and OrganizationService._is_last_admin(
            db, organization_id
        ):
            raise NonRemoveAbleException()
        db.delete(membership)
        db.commit()

    @staticmethod
    def list_members(db: Session, organization_id: int):
        memberships = (
            db.query(OrganizationMember)
            .filter(OrganizationMember.organization_id == organization_id)
            .order_by(
                case((OrganizationMember.role == RoleEnum.ADMIN, 0), else_=1),
                OrganizationMember.joined_at.asc(),
            )
            .all()
        )
        return [
            OrganizationService._member_dict(db, membership)
            for membership in memberships
        ]

    @staticmethod
    def update_organization(
        db: Session, organization_id: int, update_data: OrganizationUpdate
    ):
        organization = (
            db.query(Organization).filter(Organization.id == organization_id).first()
        )
        if not organization:
            raise HTTPException(status_code=404, detail="Organization not found")

        for key, value in update_data.model_dump(exclude_unset=True).items():
            if hasattr(organization, key):
                setattr(organization, key, value)

        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=400, detail="Organization name already exists"
            )
        db.refresh(organization)
        return organization
