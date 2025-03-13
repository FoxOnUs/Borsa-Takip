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

# ----------------------- NEW FAVORITE STOCK CRUD OPERATIONS -----------------------

def add_favorite_stock_to_user(db: Session, user_id: int, stock_name: str, stock_double: float = None):
    """
    Adds a favorite stock to a user.

    Raises ValueError if stock_name is invalid or duplicate for the user.
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return None 

    try:
        favorite_stock = models.FavoriteStock(user_id=user_id, stock_name=stock_name, stock_double=stock_double)
        db.add(favorite_stock)
        db.commit()
        db.refresh(favorite_stock)
        return favorite_stock
    except ValueError as ve:
        db.rollback() 
        raise ve # re-raise the validation error from the model
    except Exception as e: # Catch other potential DB errors (like unique constraint violation)
        db.rollback()
        # Check if it's a unique constraint violation specifically
        if "unique_user_stock" in str(e):
            raise ValueError(f"Stock '{stock_name}' is already in user's favorites.")
        else:
            raise Exception(f"Error adding favorite stock: {e}") 


def remove_favorite_stock_from_user(db: Session, user_id: int, stock_name: str):
    """
    Removes a favorite stock from a user by stock name.
    Returns True if removed, False if not found.
    """
    favorite_stock = db.query(models.FavoriteStock).filter(
        models.FavoriteStock.user_id == user_id,
        models.FavoriteStock.stock_name == stock_name
    ).first()
    if favorite_stock:
        db.delete(favorite_stock)
        db.commit()
        return True
    return False

def get_user_favorite_stocks(db: Session, user_id: int):
    return db.query(models.FavoriteStock).filter(models.FavoriteStock.user_id == user_id).all()

def get_user_favorite_stock_by_name(db: Session, user_id: int, stock_name: str):
    return db.query(models.FavoriteStock).filter(
        models.FavoriteStock.user_id == user_id,
        models.FavoriteStock.stock_name == stock_name
    ).first()