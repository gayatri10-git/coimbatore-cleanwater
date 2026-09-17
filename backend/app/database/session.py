import os
import sqlite3
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./coimbatore_cleanwater.db")

# Detect SQLite vs PostgreSQL
is_sqlite = DATABASE_URL.startswith("sqlite")

connect_args = {"check_same_thread": False} if is_sqlite else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

# If SQLite, auto-load mod_spatialite if available
if is_sqlite:
    @event.listens_for(engine, "connect")
    def load_spatialite(dbapi_conn, connection_record):
        if isinstance(dbapi_conn, sqlite3.Connection):
            dbapi_conn.enable_load_extension(True)
            try:
                dbapi_conn.load_extension("mod_spatialite")
            except Exception:
                pass  # Fallback to pure-math spatial calculations if spatialite library isn't found

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
