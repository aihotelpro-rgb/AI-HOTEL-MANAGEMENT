import os
import sys
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.config import settings

# Determine DB URL & Connection Pool settings
if "pytest" in sys.modules:
    db_url = "sqlite+aiosqlite:///:memory:"
    engine_args = {}
elif "sqlite" in settings.DATABASE_URL:
    db_url = settings.DATABASE_URL
    engine_args = {
        "connect_args": {"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
    }
else:
    # Production PostgreSQL or MySQL (MariaDB) Async Engine
    db_url = settings.DATABASE_URL
    engine_args = {
        "pool_size": 20,
        "max_overflow": 10,
        "pool_recycle": 3600,
        "pool_pre_ping": True
    }

# Create async database engine
engine = create_async_engine(
    db_url,
    echo=False,
    future=True,
    **engine_args
)

# Create session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()

# Dependency to get async DB session
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
