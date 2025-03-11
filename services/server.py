# services/api.py

import sys
import os
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from flask import Flask, json, request, jsonify 
from flask_cors import CORS
from sqlalchemy.orm import Session
from db.database import get_db, create_database
from services import crud
import yfinance

#create_database() # 1 time run

app = Flask(__name__)
CORS(app, origins=[os.environ.get("FRONT_ORIGINS")])

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
    

@app.route("/stock/<symbol>", methods=["GET"])
def get_stock_price(symbol):
    """API endpoint to get daily stock data for a given symbol."""
    interval = request.args.get('interval', '1d')
    period = request.args.get('period', '1mo')
    
    try:
        print(f"Attempting to download data for {symbol} with interval={interval}, period={period}")
        
        # adding a retry mechanism - sometimes(almost always if there is batch) yfinance needs a second attempt
        max_retries = 2
        for attempt in range(max_retries):
            try:
                stock_data = yfinance.download(
                    tickers=symbol, 
                    period=period, 
                    interval=interval,
                    progress=False  
                )
                
                if not stock_data.empty:
                    break
                    
                print(f"Attempt {attempt+1}: Empty data received for {symbol}. Retrying...")
                time.sleep(1)  # wait a second before retrying
                
            except Exception as e:
                print(f"Attempt {attempt+1} failed: {str(e)}")
                if attempt == max_retries - 1:  # if this was the last attempt
                    raise
                time.sleep(1)  # wait before retry
        
        # handle empty dataframe
        if stock_data.empty:
            return jsonify({
                "error": f"No data available for {symbol} with interval={interval}, period={period}"
            }), 404
            
        
        result = {}
        
        
        if interval == '1d':
            time_series_key = "Time Series (Daily)"
        elif interval in ['1m', '5m', '15m', '30m', '60m']:
            time_series_key = "Time Series (5min)"
        else:
            time_series_key = f"Time Series ({interval})"
        
        
        result[time_series_key] = {}
        
        for index, row in stock_data.iterrows():
            
            date_str = index.strftime('%Y-%m-%d %H:%M:%S')
            
            
            data_point = {
                "1. open": str(row.get('Open', 0)),
                "2. high": str(row.get('High', 0)),
                "3. low": str(row.get('Low', 0)),
                "4. close": str(row.get('Close', 0)),
                "5. volume": str(row.get('Volume', 0))
            }
            
            result[time_series_key][date_str] = data_point
            
        return jsonify(result), 200
        
    except Exception as e:
        import traceback
        error_message = str(e)
        error_traceback = traceback.format_exc()
        
        print(f"Error processing {symbol}: {error_message}")
        print(f"Traceback: {error_traceback}")
        return jsonify({
            "error": f"Failed to retrieve data for {symbol}: {error_message}"
        }), 500
    
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

@app.route('/api/stock_symbols', methods=['GET'])
def get_stock_symbols():
    stock_symbols = read_stock_list_from_file(SERVICE_STOCK_LIST_FILE)
    if stock_symbols:
        return jsonify(stock_symbols) 
    else:
        return jsonify({"error": "Could not retrieve stock symbols"}), 500 

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

    """
    # Threading for polling
    import threading
    polling_thread = threading.Thread(target=main_polling_loop)
    polling_thread.daemon = True
    polling_thread.start()
    """
    app.run(debug=True)