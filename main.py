from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import sqlite3

app = Flask(__name__)
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(',')
CORS(app, resources={r"/*": {"origins": CORS_ORIGINS}})

DATABASE = "game.db"


# --- Helper function to interact with the database ---
def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row  # return dict-like rows
    return conn


# --- Initialize the database ---
def init_db():
    conn = get_db_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS positions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT UNIQUE NOT NULL,
            team_id TEXT NOT NULL,
            game_id TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS points (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            point_id TEXT UNIQUE NOT NULL,
            game_id TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            captured INTEGER NOT NULL DEFAULT 0,
            defenders INTEGER NOT NULL DEFAULT 0,
            attackers INTEGER NOT NULL DEFAULT 0,
            team_id TEXT DEFAULT 'NOBODY',
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS games (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id TEXT UNIQUE NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

@app.route("/")
def index():
    return render_template("index.html")

@app.route('/add_game')
def create_game():
    return render_template('add_game.html')

@app.route('/display_game/<game_id>')
def display_game(game_id):
    return render_template('display.html')

@app.route('/join/<game_id>')
def join_game(game_id):
    return render_template('join.html')

#--- END POINT FOR CREATING USERS AND STORING AND UPDATING THEIR POSITIONS ---#

# --- POST: Add a new position ---
@app.route("/positions", methods=["POST"])
def add_position():
    data = request.get_json()

    user_id = data.get("user_id")
    team_id = data.get("team_id")
    game_id = data.get("game_id")
    latitude = data.get("latitude")
    longitude = data.get("longitude")

    if user_id is None or latitude is None or longitude is None or team_id is None or game_id is None:
        return jsonify({"error": "user_id, latitude, and longitude are required"}), 400

    try:
        conn = get_db_connection()
        conn.execute(
            "INSERT INTO positions (user_id, team_id, game_id, latitude, longitude) VALUES (?, ?, ?, ?, ?)",
            (user_id, team_id, game_id, latitude, longitude),
        )
        conn.commit()
        conn.close()
        return jsonify({"message": "Position added successfully"}), 201
    except sqlite3.IntegrityError:
        conn.commit()
        conn.close()
        return jsonify({"error": "User ID already exists. Use PUT to update."}), 409


# --- GET: Retrieve all positions for given game---
@app.route("/positions/<game_id>", methods=["GET"])
def get_positions(game_id):
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM positions WHERE game_id = ?", (game_id,)).fetchall()
    conn.commit()
    conn.close()
    positions = [dict(row) for row in rows]
    

    return jsonify(positions)


# --- PUT: Update position for a given user ---
@app.route("/positions/<user_id>", methods=["PUT"])
def update_position(user_id):
    data = request.get_json()
    latitude = data.get("latitude")
    longitude = data.get("longitude")

    if latitude is None or longitude is None:
        return jsonify({"error": "latitude and longitude are required"}), 400

    conn = get_db_connection()
    result = conn.execute(
        "UPDATE positions SET latitude = ?, longitude = ?, timestamp = CURRENT_TIMESTAMP WHERE user_id = ?",
        (latitude, longitude, user_id),
    )
    conn.commit()
    conn.close()

    if result.rowcount == 0:
        return jsonify({"error": "User not found"}), 404

    return jsonify({"message": "Position updated successfully"})

# --- DELETE: Delete all positions for a given game_id ---
@app.route("/positions/<game_id>", methods=["DELETE"])
def delete_positions_by_game(game_id):
    conn = get_db_connection()
    result = conn.execute("DELETE FROM positions WHERE game_id = ?", (game_id,))
    conn.commit()
    conn.close()

    if result.rowcount == 0:
        return jsonify({"message": f"No positions found for game_id '{game_id}'"}), 404

    return jsonify({"message": f"Deleted position(s) for game_id '{game_id}'"}), 200

# --- ENDPOINTS FOR CREATING CONTROL POINTS --- #

@app.route("/points", methods=["POST"])
def add_point():
    data = request.get_json()

    point_id = data.get("point_id")
    game_id = data.get("game_id")
    latitude = data.get("latitude")
    longitude = data.get("longitude")

    if point_id is None or latitude is None or longitude is None or game_id is None:
        return jsonify({"error": "point_id, game_id, latitude, and longitude are required"}), 400

    try:
        conn = get_db_connection()
        conn.execute(
            "INSERT INTO points (point_id, game_id, latitude, longitude) VALUES (?, ?, ?, ?)",
            (point_id, game_id, latitude, longitude),
        )
        conn.commit()
        conn.close()
        return jsonify({"message": "Point added successfully"}), 201
    except sqlite3.IntegrityError:
        conn.commit()
        conn.close()
        return jsonify({"error": "Point ID already exists. Use PUT to update."}), 409
    
# --- GET: Retrieve all points for given game---
@app.route("/points/<game_id>", methods=["GET"])
def get_points(game_id):
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM points WHERE game_id = ?", (game_id,)).fetchall()
    conn.commit()
    conn.close()
    positions = [dict(row) for row in rows]
    

    return jsonify(positions)

@app.route("/points/<game_id>/<point_id>", methods=["PUT"])
def update_points(game_id, point_id):
    data = request.get_json()
    captured = data.get("captured")
    defenders = data.get("defenders")
    attackers = data.get("attackers")
    team_id = data.get("team_id")
    game_id = data.get("game_id")
    point_id = data.get("point_id")

    if game_id is None or point_id is None:
        return jsonify({"error": "Need an existing game and point id"}), 400

    conn = get_db_connection()
    result = conn.execute(
        "UPDATE points SET captured = ?, defenders = ?, attackers = ?, team_id = ?, timestamp = CURRENT_TIMESTAMP WHERE game_id = ? AND point_id = ?",
        (captured, defenders, attackers, team_id, game_id, point_id),
    )
    conn.commit()
    conn.close()

    if result.rowcount == 0:
        return jsonify({"error": "User not found"}), 404

    return jsonify({"message": "Point updated successfully"})

# --- DELETE: Delete a given point ---
@app.route("/points/<game_id>", methods=["DELETE"])
def delete_points_by_game(game_id):
    conn = get_db_connection()
    result = conn.execute("DELETE FROM positions WHERE game_id = ?", (game_id,))
    conn.commit()
    conn.close()

    if result.rowcount == 0:
        return jsonify({"message": f"No positions found for game_id '{game_id}'"}), 404

    return jsonify({"message": f"Deleted position(s) for game_id '{game_id}'"}), 200

# --- End Points for Creating a Game

# --- POST: Add a new position ---
@app.route("/games", methods=["POST"])
def add_game():
    data = request.get_json()

    game_id = data.get("game_id")
    latitude = data.get("latitude")
    longitude = data.get("longitude")

    if latitude is None or longitude is None or game_id is None:
        return jsonify({"error": "game_id, latitude, and longitude are required"}), 400

    try:
        conn = get_db_connection()
        conn.execute(
            "INSERT INTO games (game_id, latitude, longitude) VALUES (?, ?, ?)",
            (game_id, latitude, longitude),
        )
        conn.commit()
        conn.close()
        return jsonify({"message": "Game added successfully"}), 201
    except sqlite3.IntegrityError:
        conn.commit()
        conn.close()
        return jsonify({"error": "Game already exists. Use a unique name"}), 409


# --- GET: Retrieve all positions for given game---
@app.route("/games", methods=["GET"])
def get_games():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM games").fetchall()
    conn.commit()
    conn.close()
    positions = [dict(row) for row in rows]
    
    return jsonify(positions)

# --- DELETE: Delete all positions for a given game_id ---
@app.route("/games/<game_id>", methods=["DELETE"])
def delete_game(game_id):
    conn = get_db_connection()
    result = conn.execute("DELETE FROM games WHERE game_id = ?", (game_id,))
    conn.commit()
    conn.close()

    if result.rowcount == 0:
        return jsonify({"message": f"Game id not found. Doesn't exist or already deleted '{game_id}'"}), 404

    return jsonify({"message": f"Deleted game id'{game_id}'"}), 200


if __name__ == "__main__":
    init_db()
    app.run(debug=True)