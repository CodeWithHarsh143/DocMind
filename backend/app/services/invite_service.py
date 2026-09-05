from fastapi import HTTPException
from app.models.organization import OrganizationMember
from sqlalchemy.orm import Session


class InviteService:
    @staticmethod
    def _get_pending_by_token(db: Session, invite_token: str) -> OrganizationMember:
        membership = (
            db.query(OrganizationMember)
            .filter(OrganizationMember.invite_token == invite_token)
            .first()
        )
        if membership is None:
            raise HTTPException(
                status_code=404,
                detail="Invite not found. It may have already been accepted or declined.",
            )
        return membership

    @staticmethod
    def _info_dict(membership: OrganizationMember) -> dict:
        return {
            "org_name": membership.organization.name,
            "inviter_name": membership.inviter.name if membership.inviter else None,
            "invited_email": membership.user.email,
            "status": membership.status,
            "token": membership.invite_token,
        }

    @staticmethod
    def get_invite_by_token(db: Session, invite_token: str) -> dict:
        membership = InviteService._get_pending_by_token(db, invite_token)
        return InviteService._info_dict(membership)

    @staticmethod
    def accept_invite(
        db: Session, current_user_id: int, invite_token: str
    ) -> OrganizationMember:
        membership = InviteService._get_pending_by_token(db, invite_token)
        if membership.user_id != current_user_id:
            raise HTTPException(
                status_code=403,
                detail="This invite was sent to a different email address.",
            )
        membership.status = "active"
        membership.invite_token = None
        db.commit()
        db.refresh(membership)
        return membership

    @staticmethod
    def reject_invite(db: Session, invite_token: str, current_user_id: int) -> None:
        membership = InviteService._get_pending_by_token(db, invite_token)
        if membership.user_id != current_user_id:
            raise HTTPException(
                status_code=403,
                detail="This invite was sent to a different email address.",
            )
        db.delete(membership)
        db.commit()

    @staticmethod
    def list_pending(db: Session, current_user_id: int) -> list[dict]:
        pending_invites = (
            db.query(OrganizationMember)
            .filter(
                OrganizationMember.user_id == current_user_id,
                OrganizationMember.status == "pending",
                OrganizationMember.invite_token.isnot(None),
            )
            .order_by(OrganizationMember.invited_at.asc())
            .all()
        )
        return [InviteService._info_dict(invite) for invite in pending_invites]