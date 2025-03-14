# db/database.py
import subprocess
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os 
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_database(): # Function to create the database and tables
    Base.metadata.create_all(bind=engine)

def run_migrations():
    print("Running database migrations...")
    try:
        subprocess.check_call(['alembic', 'upgrade', 'head'], cwd='db') # Run alembic upgrade
        print(f"Database migrations completed successfully using URL: {DATABASE_URL}")
    except subprocess.CalledProcessError as e:
        print("Error running database migrations:")
        print(e)

if __name__ == "__main__": # Example of how to run this to create tables
    create_database()
    print("Database and tables created!")