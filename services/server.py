# services/api.py

import sys
import os
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from flask import Flask, request, jsonify 
from flask_cors import CORS
from sqlalchemy.orm import Session
from db.database import get_db, create_database
from services import crud
import requests
from datetime import datetime

#create_database() # 1 time run

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])

# --- Alpha Vantage Configuration ---
ALPHA_VANTAGE_API_KEY = "SSS1HHVV24YRZDHC"
if not ALPHA_VANTAGE_API_KEY:
    raise ValueError("ALPHA_VANTAGE_API_KEY environment variable not set")
ALPHA_VANTAGE_BASE_URL = "https://www.alphavantage.co/query"


# ---INTRADAY---

def fetch_stock_data_from_alpha_vantage(symbol, interval='1min'): 
    function = "TIME_SERIES_INTRADAY"
    params = {
        "function": function,
        "symbol": symbol,
        "interval": interval, 
        "apikey": ALPHA_VANTAGE_API_KEY
    }
    try:
        response = requests.get(ALPHA_VANTAGE_BASE_URL, params=params)
        response.raise_for_status()
        data = response.json()

        if 'Error Message' in data:
            return {"error": f"Alpha Vantage API Error: {data['Error Message']}"}
        time_series_key = f'Time Series ({interval})'
        if not data.get(time_series_key):
            return {"error": f"No intraday time series data found for symbol or invalid interval: {interval}"}

        intraday_data = data[time_series_key]
        stock_data = []
        for datetime_str, values in intraday_data.items():
            stock_data.append({
                "datetime": datetime_str, 
                "open": float(values['1. open']),
                "high": float(values['2. high']),
                "low": float(values['3. low']),
                "close": float(values['4. close']),
                "volume": int(values['5. volume'])
            })
        return {"symbol": symbol, "interval": interval, "intraday_prices": stock_data} 
    except requests.exceptions.RequestException as e:
        return {"error": f"API request failed: {str(e)}"}
    except ValueError as e:
        return {"error": f"JSON decoding failed: {str(e)}"}
    except Exception as e:
        return {"error": f"Unexpected error: {str(e)}"}


@app.route("/stock/<symbol>", methods=["GET"])
def get_stock_price(symbol):
    """API endpoint to get intraday stock data for a given symbol."""
    interval = request.args.get('interval', '1min') 
    stock_data_result = fetch_stock_data_from_alpha_vantage(symbol, interval=interval) 
    if "error" in stock_data_result:
        status_code = 400 if stock_data_result["error"].startswith("Alpha Vantage API Error") else 500
        return jsonify({"message": stock_data_result["error"]}), status_code
    return jsonify(stock_data_result), 200

@app.route("/register", methods=["POST"])
def register_user():
    db_gen = get_db()
    db_session = next(db_gen)
    try:
        data = request.get_json()
        nickname = data.get("nickname")
        email = data.get("email")
        password = data.get("password")

        if not nickname or not email or not password:
            return jsonify({"message": "Nickname, email, and password are required"}), 400

        user = crud.create_user(db_session, nickname=nickname, email=email, password=password)
        next(db_gen, None)
        return jsonify({"message": "User registered successfully", "user_id": user.id}), 201
    except Exception as e:
        next(db_gen, None)
        return jsonify({"message": "Registration failed", "error": str(e)}), 500

@app.route("/login", methods=["POST"])
def login_user():
     
    db_gen = get_db()
    db_session = next(db_gen)
    try:
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"message": "Email and password are required"}), 400

        user = crud.get_user_by_email(db_session, email=email)
        if user and user.check_password(password):
            next(db_gen, None)
            return jsonify({"message": "Login successful", "user_id": user.id, "nickname": user.nickname, "email": user.email}), 200
        else:
            next(db_gen, None)
            return jsonify({"message": "Invalid credentials"}), 401
    except Exception as e:
        next(db_gen, None)
        return jsonify({"message": "Login failed", "error": str(e)}), 500


@app.route("/users/<int:user_id>/nickname", methods=["PUT"])
def update_user_nickname(user_id: int):
     
    db_gen = get_db()
    db_session = next(db_gen)
    try:
        data = request.get_json()
        new_nickname = data.get("nickname")

        if not new_nickname:
            return jsonify({"message": "New nickname is required"}), 400

        updated_user = crud.update_nickname(db_session, user_id=user_id, new_nickname=new_nickname)
        next(db_gen, None)
        if updated_user:
            return jsonify({"message": "Nickname updated successfully", "nickname": updated_user.nickname}), 200
        else:
            return jsonify({"message": "User not found"}), 404
    except Exception as e:
        next(db_gen, None)
        return jsonify({"message": "Failed to update nickname", "error": str(e)}), 500

@app.route("/users/<int:user_id>/password", methods=["PUT"])
def update_user_password(user_id: int):
     
    db_gen = get_db()
    db_session = next(db_gen)
    try:
        data = request.get_json()
        new_password = data.get("password")

        if not new_password:
            return jsonify({"message": "New password is required"}), 400

        updated_user = crud.update_password(db_session, user_id=user_id, new_password=new_password)
        next(db_gen, None)
        if updated_user:
            return jsonify({"message": "Password updated successfully"}), 200
        else:
            return jsonify({"message": "User not found"}), 404
    except Exception as e:
        next(db_gen, None)
        return jsonify({"message": "Failed to update password", "error": str(e)}), 500

@app.route("/users/<int:user_id>/favorite_stocks", methods=["PUT"])
def update_user_favorite_stocks(user_id: int):
     
    db_gen = get_db()
    db_session = next(db_gen)
    try:
        data = request.get_json()
        favorite_stocks_data = data.get("favorite_stocks") 

        if not isinstance(favorite_stocks_data, list):
            return jsonify({"message": "Favorite stocks must be a list of [name, double] pairs"}), 400

        updated_user = crud.update_favorite_stocks(db_session, user_id=user_id, new_favorite_stocks=favorite_stocks_data)
        next(db_gen, None)
        if updated_user:
            return jsonify({
                "message": "Favorite stocks updated successfully",
                "favorite_stocks": [{"name": n, "double": d} for n, d in zip(updated_user.favorite_stock_names, updated_user.favorite_stock_doubles)]
            }), 200
        else:
            return jsonify({"message": "User not found"}), 404
    except ValueError as ve: 
        next(db_gen, None)
        return jsonify({"message": "Invalid favorite stocks data", "error": str(ve)}), 400
    except Exception as e:
        next(db_gen, None)
        return jsonify({"message": "Failed to update favorite stocks", "error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)