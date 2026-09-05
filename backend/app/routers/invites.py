from fastapi import Depends, APIRouter
from sqlalchemy.orm import Session
from app.services.invite_service import InviteService
from app.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.schemas.organization import (
    InviteResponse,
    OrganizationMemberResponse,
)

router = APIRouter(prefix="/invite", tags=["invites"])


@router.get("/mine", response_model=list[InviteResponse])
def list_pending_invites(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
) -> list[InviteResponse]:
    return InviteService.list_pending(db=db, current_user_id=current_user.id)


@router.get("/{token}", response_model=InviteResponse)
def invite_page(token: str, db: Session = Depends(get_db)) -> InviteResponse:
    return InviteService.get_invite_by_token(db=db, invite_token=token)


@router.post("/{token}/accept", response_model=OrganizationMemberResponse)
def accept_invite(
    token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    membership = InviteService.accept_invite(
        db=db, current_user_id=current_user.id, invite_token=token
    )
    from app.services.organization_service import OrganizationService

    return OrganizationService._member_dict(db, membership)


@router.post("/{token}/reject", status_code=204)
def reject_invite(
    token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    InviteService.reject_invite(
        db=db, invite_token=token, current_user_id=current_user.id
    )