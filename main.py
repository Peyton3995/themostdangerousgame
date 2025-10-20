from flask import Flask, request, jsonify, render_template
import sqlite3

app = Flask(__name__)
DATABASE = "positions.db"


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
            latitude REAL NOT NULL,
            longitude REAL NOT NULL
        )
    """)
    conn.commit()
    conn.close()

@app.route("/")
def index():
    return render_template("index.html")

# --- POST: Add a new position ---
@app.route("/positions", methods=["POST"])
def add_position():
    data = request.get_json()

    user_id = data.get("user_id")
    latitude = data.get("latitude")
    longitude = data.get("longitude")

    if not user_id or latitude is None or longitude is None:
        return jsonify({"error": "user_id, latitude, and longitude are required"}), 400

    try:
        conn = get_db_connection()
        conn.execute(
            "INSERT INTO positions (user_id, latitude, longitude) VALUES (?, ?, ?)",
            (user_id, latitude, longitude),
        )
        conn.commit()
        conn.close()
        return jsonify({"message": "Position added successfully"}), 201
    except sqlite3.IntegrityError:
        conn.commit()
        conn.close()
        return jsonify({"error": "User ID already exists. Use PUT to update."}), 409


# --- GET: Retrieve all positions ---
@app.route("/positions", methods=["GET"])
def get_positions():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM positions").fetchall()
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
        "UPDATE positions SET latitude = ?, longitude = ? WHERE user_id = ?",
        (latitude, longitude, user_id),
    )
    conn.commit()
    conn.close()

    if result.rowcount == 0:
        return jsonify({"error": "User not found"}), 404

    return jsonify({"message": "Position updated successfully"})


if __name__ == "__main__":
    init_db()
    app.run(debug=True)