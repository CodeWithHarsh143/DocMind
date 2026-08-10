from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.organization import Organization, OrganizationMember, RoleEnum
from app.models.user import User
from app.schemas.organization import OrganizationCreate


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
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member on this organization",
            )
        return membership

    @staticmethod
    def require_admin(
        db: Session, organization_id: int, user_id: int
    ) -> OrganizationMember:
        membership = OrganizationService.is_member(db, organization_id, user_id)
        if membership is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="You are not an admin"
            )
        if membership.role != RoleEnum.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Your are not a admin"
            )
        return membership

    @staticmethod
    def add_member(
        db: Session,
        organization_id: int,
        user_id: int,
        role: RoleEnum = RoleEnum.USER,
    ):
        alredy = OrganizationService.is_member(db, organization_id, user_id)

        if alredy is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="member is alredy in organization",
            )
        membership = OrganizationMember(
            user_id=user_id, organization_id=organization_id, role=role
        )

        db.add(membership)
        db.commit()
        db.refresh(membership)
        return membership
