from sqlalchemy.orm import Session
from app.models.organization import Organization, OrganizationMember, RoleEnum
from app.models.user import User
from app.schemas.organization import OrganizationCreate
from app.core.exceptions import (
    NotAMemberException,
    NotAnAdminException,
    AlreadyMemberException,
)


class OrganizationService:
    @staticmethod
    def create(
        db: Session, org_data: OrganizationCreate, current_user: User
    ) -> Organization | None:
        new_org = Organization(name=org_data.name)
        db.add(new_org)
        db.commit()
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
