# db/models.py
from sqlalchemy import Column, Integer, String, ARRAY, Float
from sqlalchemy.sql import expression
from db.database import Base 

import bcrypt

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    nickname = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    favorite_stock_names = Column(ARRAY(String(5)), default=[], server_default=expression.text("'{}'"))
    favorite_stock_doubles = Column(ARRAY(Float), default=[], server_default=expression.text("'{}'"))

    def set_password(self, password_plaintext):
        #Hash the password.
        salt = bcrypt.gensalt()
        hashed_password = bcrypt.hashpw(password_plaintext.encode('utf-8'), salt)
        self.password_hash = hashed_password.decode('utf-8')

    def check_password(self, password_plaintext):
        #Check the provided plaintext password matches the stored hash.
        return bcrypt.checkpw(password_plaintext.encode('utf-8'), self.password_hash.encode('utf-8'))