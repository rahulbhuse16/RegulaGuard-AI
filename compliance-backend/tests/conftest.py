import os

os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://test:test@localhost:5432/test_db")
os.environ.setdefault("ASYNC_DATABASE_URL", "postgresql+asyncpg://test:test@localhost:5432/test_db")
os.environ.setdefault("JWT_SECRET", "test-secret-not-for-production")
os.environ.setdefault("GROQ_API_KEY", "test-key")
