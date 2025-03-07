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
CORS(app, origins=[os.environ.get("FRONT_ORIGINS")])

# --- Alpha Vantage Configuration ---
ALPHA_VANTAGE_API_KEY = os.environ.get("ALPHA_VANTAGE_SSH")
if not ALPHA_VANTAGE_API_KEY:
    raise ValueError("ALPHA_VANTAGE_API_KEY environment variable not set")
ALPHA_VANTAGE_BASE_URL = "https://www.alphavantage.co/query"


# -----POLLING------

SERVICE_STOCK_LIST_FILE = os.environ.get("STOCK_LIST_PATH")
app.config['POLLING_INTERVAL_SECONDS'] = os.environ.get("POLLING_INTERVAL_SECONDS")

def read_stock_list_from_file(filepath):
    try:
        with open(filepath, 'r') as file:
            json_string = file.read()
            stock_ticker_list = json.loads(json_string)
            return stock_ticker_list
    except FileNotFoundError:
        print(f"Error: File not found at path: {filepath}")
        return None
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from file: {filepath}.  Please ensure it's valid JSON.")
        return None
    except Exception as e:
        print(f"An unexpected error occurred while reading stock list file: {e}")
        return None
    
# ---INTRADAY&DAILY---
def fetch_stock_data_from_alpha_vantage(symbol, data_type='intraday', interval='1min'):
    if data_type == 'intraday':
        function = "TIME_SERIES_INTRADAY"
        time_series_key_prefix = 'Time Series'
        params = {
            "function": function,
            "symbol": symbol,
            "interval": interval,
            "apikey": ALPHA_VANTAGE_API_KEY
        }
        interval_key = f'({interval})' # e.g. "(1min)"

    elif data_type == 'daily':
        function = "TIME_SERIES_DAILY"
        time_series_key_prefix = 'Time Series' 
        params = {
            "function": function,
            "symbol": symbol,
            "apikey": ALPHA_VANTAGE_API_KEY
        }
        interval_key = '(Daily)' # Key is "(Daily)" 
    try:
        response = requests.get(ALPHA_VANTAGE_BASE_URL, params=params)
        response.raise_for_status()
        data = response.json()

        if 'Error Message' in data:
            return {"error": f"Alpha Vantage API Error: {data['Error Message']}"}
        time_series_key = f'Time Series ({interval})'
        if not data.get(time_series_key):
            return {"error": f"No intraday time series data found for symbol or invalid interval: {interval}"}

        time_series_data = data[time_series_key]
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
        if data_type == 'intraday':
            return {"symbol": symbol, "interval": interval, "intraday_prices": stock_data}
        elif data_type == 'daily':
            return {"symbol": symbol, "daily_prices": stock_data}
    except requests.exceptions.RequestException as e:
        return {"error": f"API request failed: {str(e)}"}
    except ValueError as e:
        return {"error": f"JSON decoding failed: {str(e)}"}
    except Exception as e:
        return {"error": f"Unexpected error: {str(e)}"}
    
# ----- Main Polling -----
def main_polling_loop():
    while True:
        start.time = time.time()

        stock_symbols=read_stock_list_from_file(SERVICE_STOCK_LIST_FILE)
        if not stock_symbols:
            app.logger.error("Failed to load stock symbols from file. Please check the file and path.")
            time.sleep(POLLING_INTERVAL_SECONDS) # Wait before retrying
            continue # Pass to next loop if doesn't exist
        for symbol in stock_symbols:
            app.logger.info(f"Fetching data for: {symbol}...") 
            stock_data_result = fetch_stock_data_from_alpha_vantage(symbol)

            if "error" in stock_data_result:
                app.logger.error(f"  Error fetching data for {symbol}: {stock_data_result['error']}") 
            else:
                app.logger.info(f"  Successfully fetched {len(stock_data_result['intraday_prices'])} data points for {symbol} ({stock_data_result['interval']}).") 

        end_time = time.time()
        elapsed_time = end_time - start_time
        wait_time = max(0, app.config['POLLING_INTERVAL_SECONDS'] - elapsed_time) 

        app.logger.info(f"--- Data fetching cycle completed in {elapsed_time:.2f} seconds. Waiting for {wait_time:.2f} seconds until next poll. ---") 
        time.sleep(wait_time)

@app.route("/stock/<symbol>", methods=["GET"])
def get_stock_price(symbol):
    """API endpoint to get daily stock data for a given symbol.""" # intraday should be the polling one
    interval = request.args.get('interval', '1min') 
    data_type='daily'
    stock_data_result = fetch_stock_data_from_alpha_vantage(symbol,data_type, interval=interval) 
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

    # Threading for polling
    import threading
    polling_thread = threading.Thread(target=main_polling_loop)
    polling_thread.daemon = True
    polling_thread.start()

    app.run(debug=True)