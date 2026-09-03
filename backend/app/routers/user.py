import aiofiles
import os
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.schemas.user import UserResponse, ProfileUpdate

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
IMAGE_EXTENSIONS = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB

UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "storage", "uploads"
)
os.makedirs(UPLOAD_DIR, exist_ok=True)


router = APIRouter(prefix="/users", tags=["Users"])


@router.patch("/me/profile", response_model=UserResponse)
def update_profile(
    profile_data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if profile_data.name is not None:
        current_user.name = profile_data.name
    if profile_data.phone is not None:
        current_user.phone = profile_data.phone
    if profile_data.avatar_url is not None:
        current_user.avatar_url = profile_data.avatar_url
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/avatar")
async def upload_avatar(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    file: UploadFile = File(...),
):
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
                raise HTTPException(status_code=400, detail="PNG, JPG or WebP up to 5MB.")
            await f.write(chunk)

    current_user.avatar_url = f"/uploads/{unique_name}"
    db.commit()
    db.refresh(current_user)
    return {"avatar_url": current_user.avatar_url}
