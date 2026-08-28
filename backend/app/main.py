from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import auth, organization, document
from app.core.exceptions import DocMindExceptions

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


app.include_router(auth.router)
app.include_router(organization.router)
app.include_router(document.router)
Base.metadata.create_all(bind=engine)
