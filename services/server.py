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
from cachetools import TTLCache
import concurrent.futures

#create_database() # 1 time run

app = Flask(__name__)
CORS(app, origins=[os.environ.get("FRONT_ORIGINS")])

SERVICE_STOCK_LIST_FILE = os.environ.get("STOCK_LIST_PATH")
app.config['POLLING_INTERVAL_SECONDS'] = os.environ.get("POLLING_INTERVAL_SECONDS")

def read_stock_list_from_file(filepath):
    """Read the stock symbols from the json file."""
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
    
def extract_float_from_dictionary(input_string):
    """Function to extract float value from pd.series version of the yfinance row as string."""
    if not isinstance(input_string, str):
        print("Warning: Expected string input, got:", type(input_string))
        return None

    lines = input_string.splitlines()
    if len(lines) > 1:
        try:
            price_str = lines[1].strip().split()[-1]
            price_value = float(price_str)
            return price_value
        except (ValueError, IndexError):
            print(f"Warning: Could not parse float from string: {input_string}")
            return None
    return -1

stock_cache = TTLCache(maxsize=500, ttl=300)

def fetch_stock_data(symbol, interval, period):
    """Function to fetch stock data with retry logic"""
    cache_key = f"{symbol}_{interval}_{period}"
    
    # return cached data if available & catching is more suitable than writing it to the database
    if cache_key in stock_cache:
        return stock_cache[cache_key]
    
    max_retries = 2
    backoff_factor = 0.5
    
    for attempt in range(max_retries):
        try:
            stock_data = yfinance.download(
                tickers=symbol, 
                period=period, 
                interval=interval,
                progress=False
            )
            
            if not stock_data.empty:
                # cache the results
                stock_cache[cache_key] = stock_data
                return stock_data
                
            print(f"Attempt {attempt+1}: Empty data received for {symbol}. Retrying...")
            # exponential backoff to let yfinance retrieve the data 
            time.sleep(backoff_factor * (2 ** attempt))
                
        except Exception as e:
            print(f"Attempt {attempt+1} failed for {symbol}: {str(e)}")
            if attempt == max_retries - 1:  # if this was the last attempt
                raise
            time.sleep(backoff_factor * (2 ** attempt))
    
    return None

def process_stock_data(stock_data, interval):
    """Process the downloaded stock data into the desired format """
    if stock_data is None or stock_data.empty:
        return None
    
    result = {}
    
    if interval == '1d':
        time_series_key = "Time Series (Daily)"
    else:
        time_series_key = f"Time Series ({interval})"
    
    result[time_series_key] = {}
    
    for index, row in stock_data.iterrows():
        date_str = index.strftime('%Y-%m-%d %H:%M:%S')

        open_val = extract_float_from_dictionary(str(row.get('Open', 0)))
        high_val = extract_float_from_dictionary(str(row.get('High', 0)))
        low_val = extract_float_from_dictionary(str(row.get('Low', 0)))
        close_val = extract_float_from_dictionary(str(row.get('Close', 0)))
        volume_val = extract_float_from_dictionary(str(row.get('Volume', 0)))
        
        # Handle the none value for the jsonify to resolve front end errors
        data_point = {
                "1. open": None if open_val is None else open_val,
                "2. high": None if high_val is None else high_val,
                "3. low": None if low_val is None else low_val,
                "4. close": None if close_val is None else close_val,
                "5. volume": None if volume_val is None else volume_val
            }
        
        result[time_series_key][date_str] = data_point
    
    return result

# Create threads to handle concurrent requests. 
executor = concurrent.futures.ThreadPoolExecutor(max_workers=10)

@app.route("/stock/<symbol>", methods=["GET"])
def get_stock_price(symbol):
    """API endpoint to get daily stock data for a given symbol."""
    interval = request.args.get('interval', '1d')
    period = request.args.get('period', '1mo')
    
    try:
        print(f"Processing request for {symbol} with interval={interval}, period={period}")
        
        # Submit task to thread pool
        future = executor.submit(fetch_stock_data, symbol, interval, period)
        
        # Set a timeout to prevent hanging requests
        try:
            stock_data = future.result(timeout=5)  # 5 second timeout
        except concurrent.futures.TimeoutError:
            return jsonify({
                "error": f"Request timeout for {symbol}. Server is experiencing high load."
            }), 503
        
        if stock_data is None or stock_data.empty:
            return jsonify({
                "error": f"No data available for {symbol} with interval={interval}, period={period}"
            }), 404
        
        # Process the data in the thread pool to avoid blocking
        process_future = executor.submit(process_stock_data, stock_data, interval)
        result = process_future.result(timeout=3)  # 3 second timeout
        
        if result is None:
            return jsonify({
                "error": f"Error processing data for {symbol}"
            }), 500
            
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
    app.run(debug=True)