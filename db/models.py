# db/models.py
from sqlalchemy import Column, Integer, String, ARRAY, Float, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship, validates
from sqlalchemy.sql import expression
from database import Base 

import bcrypt

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    nickname = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    favorites = relationship("FavoriteStock", back_populates="user")

    def set_password(self, password_plaintext):
        #Hash the password
        salt = bcrypt.gensalt()
        hashed_password = bcrypt.hashpw(password_plaintext.encode('utf-8'), salt)
        self.password_hash = hashed_password.decode('utf-8')

    def check_password(self, password_plaintext):
        #Check the provided plaintext password matches the stored hash
        return bcrypt.checkpw(password_plaintext.encode('utf-8'), self.password_hash.encode('utf-8'))

class FavoriteStock(Base):
    __tablename__ = 'favorite_stocks'
    __table_args__ = (
        UniqueConstraint('user_id', 'stock_name', name='unique_user_stock'),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    stock_name = Column(String(5), nullable=False) 
    stock_double = Column(Float) 

    user = relationship("User", back_populates="favorites")

    @validates('stock_name')
    def validate_stock_name(self, key, stock_name):
        # Enforce max length of 5
        if len(stock_name) > 5: 
            raise ValueError("Stock name must be 5 characters or less.")
        return stock_name