# db/database.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Database URL (configure from environment variables or config file in production)
DATABASE_URL = "postgresql://test_user:pasaport15@localhost:5432/bstakip" 

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

if __name__ == "__main__": # Example of how to run this to create tables
    create_database()
    print("Database and tables created!")