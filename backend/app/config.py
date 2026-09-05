from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    expire_minutes: int
    algorithm: str
    redis_url: str
    gemini_api_key: str = ""
    google_client_id: str = ""
    google_client_secret: str = ""
    resend_api_key: str = ""
    frontend_base_url: str = "http://localhost:5173"
    email_from: str = "DocMind <onboarding@resend.dev>"
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )


settings = Settings()
