from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import Optional, List

class Settings(BaseSettings):
    ENVIRONMENT: str = "production"
    DATABASE_URL: str = "postgresql+asyncpg://postgres.eszefwyralssfhktrwno:Sankar%401986%2304@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
    REDIS_URL: str = "redis://redis:6379/0"
    JWT_SECRET: str = "super_secret_jwt_key_ai_hos_2026_prod_x987654321"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000"
    
    # Tax & Business Compliance
    GSTIN_NUMBER: str = "08AAAAA0000A1Z5"
    TAX_RATE_PERCENT: float = 12.0

    # Third Party Keys
    OPENAI_API_KEY: Optional[str] = None
    WHATSAPP_VERIFY_TOKEN: str = "aihos_verification_token_secure_2026"
    WHATSAPP_APP_SECRET: str = "aihos_whatsapp_secret_key_prod_2026"

    model_config = ConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
