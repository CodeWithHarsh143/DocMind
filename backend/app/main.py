from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from app.database import engine, Base
from app.routers import auth, organization, document, user, sessions, sessions
from app.core.exceptions import DocMindExceptions

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "storage", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(DocMindExceptions)
async def docmind_exception_handler(request: Request, exc: DocMindExceptions):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


@app.get("/")
def read_root():
    return {"message": "Welcome to the FastAPI application!"}


app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(auth.router)
app.include_router(organization.router)
app.include_router(document.router)
app.include_router(user.router)
app.include_router(sessions.org_router)
app.include_router(sessions.session_router)
Base.metadata.create_all(bind=engine)
