from flask import Flask, request, jsonify, render_template, abort
from apscheduler.schedulers.background import BackgroundScheduler
from flask_cors import CORS
import sqlite3

from flask_login import (
    LoginManager,
    UserMixin,
    login_user,
    logout_user,
    login_required,
    current_user
)
from werkzeug.security import generate_password_hash, check_password_hash

import time

class User(UserMixin):
    def __init__(self, id, username, password_hash):
        self.id = id
        self.username = username
        self.password_hash = password_hash

    @staticmethod
    def from_row(row):
        return User(
            id=row["id"],
            username=row["username"],
            password_hash=row["password_hash"]
        )

app = Flask(__name__)

app.secret_key = "change-me"

CORS(app)

login_manager = LoginManager()   
login_manager.login_view = "login"

def load_user(user_id):
    conn = get_db_connection()
    row = conn.execute(
        "SELECT * FROM users WHERE id = ?",
        (user_id,)
    ).fetchone()
    conn.close()

    return User.from_row(row) if row else None
login_manager.user_loader(load_user)

login_manager.init_app(app)

DATABASE = "game.db"


# --- Helper function to interact with the database ---
def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row  # return dict-like rows
    return conn

# --- Initialize the database ---
def init_db():
    conn = get_db_connection()

    conn.execute("PRAGMA foreign_keys = ON")

    conn.execute("""
        CREATE TABLE IF NOT EXISTS positions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            team_id TEXT NOT NULL,
            game_id INTEGER NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(game_id, user_id),
            FOREIGN KEY(game_id) REFERENCES games(id)
        )
    """)
    conn.commit()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS points (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            point_id TEXT NOT NULL,
            game_id INTEGER NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            captured INTEGER NOT NULL DEFAULT 0,
            defenders INTEGER NOT NULL DEFAULT 0,
            attackers INTEGER NOT NULL DEFAULT 0,
            team_id TEXT DEFAULT 'NOBODY',
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(point_id, game_id),
            FOREIGN KEY(game_id) REFERENCES games(id)
        )
    """)
    conn.commit()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS games (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            creator_id INTEGER NOT NULL,
            name TEXT UNIQUE NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS teams (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id INTEGER NOT NULL,
            team_id TEXT NOT NULL,
            score INTEGER NOT NULL DEFAULT 0,
            UNIQUE(game_id, team_id),
            FOREIGN KEY(game_id) REFERENCES games(id)
        )
    """)
    conn.commit()
    conn.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

# --- Routes for rendering templates
@app.route("/")
def index():
    return render_template("index.html")

@app.route('/add_game/<game_id>')
@login_required
def create_game(game_id):
    # get the user ID for the game we are trying to edit
    conn = get_db_connection()
    game = conn.execute(
        "SELECT id, name, creator_id FROM games WHERE id = ?",
        (game_id,)
    ).fetchone()
    conn.close()
    if game is None:
        abort(403)
    if (game["creator_id"] != current_user.id):
        abort(403)
    else:
        return render_template('add_game.html')

@app.route('/display_game/<game_id>')
def display_game(game_id):
    return render_template('display.html')

@app.route('/join/<game_id>/<user_id>')
def join_game(game_id, user_id):
    return render_template('join.html')

#--- END POINT FOR CREATING USERS AND STORING AND UPDATING THEIR POSITIONS ---#

# --- POST: Add a new position ---
@app.route("/positions", methods=["POST"])
@login_required
def add_position():
    data = request.get_json()

    team_id = data.get("team_id")
    game_id = data.get("game_id")
    latitude = data.get("latitude")
    longitude = data.get("longitude")

    if current_user.id is None or latitude is None or longitude is None or team_id is None or game_id is None:
        return jsonify({"error": "user_id, latitude, and longitude are required"}), 400

    try:
        print(current_user.username)
        conn = get_db_connection()
        conn.execute(
            "INSERT INTO positions (user_id, team_id, game_id, latitude, longitude) VALUES (?, ?, ?, ?, ?)",
            (current_user.username, team_id, game_id, latitude, longitude),
        )
        conn.commit()
        conn.close()
        return jsonify({"message": "Position added successfully"}), 201
    except sqlite3.IntegrityError:
        conn.commit()
        conn.close()
        return jsonify({"error": "User ID already exists. Use PUT to update."}), 409

#--- This will get just one position and is used to determine if the user is already in the game
@app.route("/position/<game_id>", methods=["GET"])
def get_my_position(game_id):
    conn = get_db_connection()
    row = conn.execute("""
        SELECT * FROM positions
        WHERE game_id = ? AND user_id = ?
    """, (game_id, current_user.username)).fetchone()
    conn.close()

    if row is None:
        return jsonify({"joined": False})

    return jsonify({
        "joined": True,
        "position": dict(row)
    })

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
@login_required
def update_position_by_user(user_id):
    data = request.get_json()
    latitude = data.get("latitude")
    longitude = data.get("longitude")
    team_id = data.get("team_id")
    game_id = data.get("game_id")
    user_id = data.get("user_id")

    if latitude is None or longitude is None:
        return jsonify({"error": "latitude and longitude are required"}), 400

    conn = get_db_connection()
    result = conn.execute(
        "UPDATE positions SET latitude = ?, longitude = ?, team_id = ?, timestamp = CURRENT_TIMESTAMP WHERE user_id = ? AND game_id = ?",
        (latitude, longitude, team_id, user_id, game_id),
    )
    conn.commit()
    conn.close()

    if result.rowcount == 0:
        return jsonify({"error": "User not found"}), 404

    return jsonify({"message": "Position updated successfully"})

# --- PUT: Update position for a given user ---
@app.route("/position/<game_id>", methods=["PUT"])
@login_required
def update_position_by_game_for_user(game_id):
    data = request.get_json()
    latitude = data.get("latitude")
    longitude = data.get("longitude")
    team_id = data.get("team_id")
    game_id = data.get("game_id")

    if latitude is None or longitude is None:
        return jsonify({"error": "latitude and longitude are required"}), 400

    conn = get_db_connection()
    result = conn.execute(
        "UPDATE positions SET latitude = ?, longitude = ?, team_id = ?, timestamp = CURRENT_TIMESTAMP WHERE user_id = ? AND game_id = ?",
        (latitude, longitude, team_id, current_user.username, game_id),
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

# delete only one position for a game
@app.route("/positions/<game_id>/<user_id>", methods=["DELETE"])
def delete_positions_by_user(game_id, user_id):
    conn = get_db_connection()
    result = conn.execute("DELETE FROM positions WHERE game_id = ? AND user_id = ?", (game_id, user_id))
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
        return jsonify({"error": "Point not found"}), 404

    return jsonify({"message": "Point updated successfully"})

# --- DELETE: Delete a given point ---
@app.route("/points/<point_id>", methods=["DELETE"])
@login_required
def delete_point(point_id):
    conn = get_db_connection()

    row = conn.execute("""
        SELECT g.creator_id
        FROM points p
        JOIN games g ON p.game_id = g.id
        WHERE p.id = ?
    """, (point_id,)).fetchone()

    if not row or row["creator_id"] != current_user.id:
        conn.close()
        return jsonify({"error": "Forbidden"}), 403

    conn.execute("DELETE FROM points WHERE id = ?", (point_id,))
    conn.commit()
    conn.close()

    return jsonify({"message": "Point deleted"}), 200

# --- End Points for Creating a Game

# --- POST: Add a new position ---
@app.route("/games", methods=["POST"])
def add_game():
    data = request.get_json()

    name = data.get("name")

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO games (name, creator_id)
            VALUES (?, ?)
            """,
            (name, current_user.id),
        )

        conn.commit()
        game_id = cursor.lastrowid
        conn.close()
        return jsonify({
                "message": "Game added successfully",
                "id":game_id
            }), 201
    except sqlite3.IntegrityError:
        conn.commit()
        conn.close()
        return jsonify({"error": "Game already exists. Use a unique name"}), 409


# --- GET: Get a list of all games ---
@app.route("/games", methods=["GET"])
def get_games():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM games").fetchall()
    conn.commit()
    conn.close()
    games = [dict(row) for row in rows]
    
    return jsonify(games)

@app.route("/games/<game_id>", methods=["GET"])
def get_game(game_id):
    conn = get_db_connection()
    game = conn.execute(
        """
        SELECT id, name, creator_id, timestamp
        FROM games
        WHERE id = ?
        """,
        (game_id,)
    ).fetchone()
    conn.commit()
    conn.close()

    if game is None:
        return jsonify({"error": "Game not found"}), 404

    return jsonify({
        "id": game["id"],
        "name": game["name"],
        "creator_id": game["creator_id"],
        "timestamp": game["timestamp"]
    })

# --- DELETE: Delete game by name---
@app.route("/games/<game_id>", methods=["DELETE"])
def delete_game(game_id):
    conn = get_db_connection()
    result = conn.execute("DELETE FROM games WHERE id = ?", (game_id,))
    conn.execute("DELETE FROM teams WHERE game_id = ?", (game_id,))
    conn.execute("DELETE FROM positions WHERE game_id = ?", (game_id,))
    conn.execute("DELETE FROM points WHERE game_id = ?", (game_id,))
    conn.commit()
    conn.close()

    if result.rowcount == 0:
        return jsonify({"message": f"Game id not found. Doesn't exist or already deleted '{game_id}'"}), 404

    return jsonify({"message": f"Deleted game id: '{game_id}'"}), 200

# --- END POINTS FOR TEAM CREATION AND UPDATING AND DELETING --- #

# --- POST: Add a new team ---
@app.route("/teams", methods=["POST"])
def add_team():
    data = request.get_json()

    game_id = data.get("game_id")
    team_id = data.get("team_id")

    if team_id is None or game_id is None:
        return jsonify({"error": "game_id, and team_id are required"}), 400

    try:
        conn = get_db_connection()
        conn.execute(
            "INSERT INTO teams (team_id, game_id) VALUES (?, ?)",
            (team_id, game_id),
        )
        conn.commit()
        conn.close()
        return jsonify({"message": "Team added successfully"}), 201
    except sqlite3.IntegrityError:
        conn.commit()
        conn.close()
        return jsonify({"error": "Team already exists. Use a unique name"}), 409


# --- GET: Retrieve all teams for a given game ---
@app.route("/teams/<game_id>", methods=["GET"])
def get_teams(game_id):
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM teams WHERE game_id = ?", (game_id,)).fetchall()
    conn.commit()
    conn.close()
    teams = [dict(row) for row in rows]
    
    return jsonify(teams)

# --- PUT: Update information for a team for a given game
# Used for updating score of teams
@app.route("/teams/<game_id>/<team_id>", methods=["PUT"])
def put_team(game_id, team_id):
    data = request.get_json()

    points = data.get("points")
    if game_id is None or team_id is None:
        return jsonify({"error": "Need an existing game and team id"}), 400
    
    conn = get_db_connection()
    result = conn.execute(
        "UPDATE teams SET score = ? WHERE game_id = ? AND team_id = ?", 
        (points, game_id, team_id)
    )
    conn.commit()
    conn.close()

    if result.rowcount == 0:
        return jsonify({"message": f"No team found for team_id '{team_id}'"}), 404

    return jsonify({"message": f"Update point(s) for team_id '{team_id}'"}), 200


# ---- Make sure to tie this to game_id 
# --- DELETE: Delete all positions for a given team_id ---
@app.route("/teams/<team_id>", methods=["DELETE"])
def delete_team(team_id):
    conn = get_db_connection()
    result = conn.execute("DELETE FROM teams WHERE team_id = ?", (team_id,))
    conn.execute("DELETE FROM positions WHERE team_id = ?", (team_id,))
    conn.commit()
    conn.close()

    if result.rowcount == 0:
        return jsonify({"message": f"Team id not found. Doesn't exist or already deleted '{team_id}'"}), 404

    return jsonify({"message": f"Deleted team id: '{team_id}'"}), 200

# --- My attempt at adding user authentication

# --- creating a user
@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "username and password required"}), 400

    password_hash = generate_password_hash(password)

    try:
        conn = get_db_connection()
        conn.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            (username, password_hash)
        )
        conn.commit()

        row = conn.execute(
            "SELECT * FROM users WHERE username = ?",
            (username,)
        ).fetchone()
        conn.close()

        login_user(User.from_row(row))
        return jsonify({"message": "User created"}), 201

    except sqlite3.IntegrityError:
        return jsonify({"error": "Username already exists"}), 409

# --- login as an existing user
@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    conn = get_db_connection()
    row = conn.execute(
        "SELECT * FROM users WHERE username = ?",
        (username,)
    ).fetchone()
    conn.close()

    if row and check_password_hash(row["password_hash"], password):
        login_user(User.from_row(row))
        return jsonify({"message": "Logged in"})

    return jsonify({"error": "Invalid credentials"}), 401

# --- logging out
@app.route("/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    return jsonify({"message": "Logged out"})

@app.route("/auth/status")
def auth_status():
    if current_user.is_authenticated:
        return jsonify({
            "authenticated": True,
            "username": current_user.username
        })
    return jsonify({"authenticated": False})

# --- Automated Jobs ---

def passive_score():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM games").fetchall()
    conn.commit()
    conn.close()
    games = [dict(row) for row in rows]



scheduler = BackgroundScheduler()
scheduler.add_job(passive_score, 'interval', seconds=10)
scheduler.start()

if __name__ == "__main__":
    init_db()
    app.run(debug=True)