# services/crud.py
from sqlalchemy.orm import Session
from db import models 

def create_user(db: Session, nickname, email, password):
    db_user = models.User(nickname=nickname, email=email)
    db_user.set_password(password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def update_nickname(db: Session, user_id: int, new_nickname: str):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        user.nickname = new_nickname
        db.commit()
        db.refresh(user)
        return user
    return None

def update_password(db: Session, user_id: int, new_password: str):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        user.set_password(new_password)
        db.commit()
        db.refresh(user)
        return user
    return None

def update_favorite_stocks(db: Session, user_id: int, new_favorite_stocks: list):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        stock_names = []
        stock_doubles = []
        if len(new_favorite_stocks) > 5:
            raise ValueError("Cannot have more than 5 favorite stocks.")
        for stock_pair in new_favorite_stocks:
            if not isinstance(stock_pair, (list, tuple)) or len(stock_pair) != 2:
                raise ValueError("Each favorite stock must be a pair of [name, double].")
            stock_name, stock_double = stock_pair
            if len(stock_name) > 5:
                raise ValueError("Stock names cannot be longer than 5 characters.")
            if not isinstance(stock_double, (int, float)):
                raise ValueError("Stock double value must be a number.")
            stock_names.append(stock_name)
            stock_doubles.append(float(stock_double))

        user.favorite_stock_names = stock_names
        user.favorite_stock_doubles = stock_doubles
        db.commit()
        db.refresh(user)
        return user
    return None