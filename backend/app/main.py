from fastapi import FastAPI
from app.database import engine, Base
from app.routers import auth, organization, document

app = FastAPI()


@app.get("/")
def read_root():
    return {"message": "Welcome to the FastAPI application!"}


app.include_router(auth.router)
app.include_router(organization.router)
app.include_router(document.router)
Base.metadata.create_all(bind=engine)
