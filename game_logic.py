import math
import sqlite3

DATABASE = "game.db"

current_game_id = 0

# --- Helper function to interact with the database ---
def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row  # return dict-like rows
    return conn

def distance_in_feet(lat1, lon1, lat2, lon2):
    R = 6371000  # meters
    to_rad = math.radians

    dlat = to_rad(lat2 - lat1)
    dlon = to_rad(lon2 - lon1)

    a = (
        math.sin(dlat / 2) ** 2 +
        math.cos(to_rad(lat1)) * math.cos(to_rad(lat2)) *
        math.sin(dlon / 2) ** 2
    )

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    meters = R * c
    return meters * 3.28084

from datetime import datetime, timedelta

# Iterate through players and find points within a hundred feet of them
# If multiple points within a hundred feet, assign to closest one
def assign_players_to_points(players, points, radius_ft=100):
    assignments = {p["id"]: [] for p in points}

    for player in players:
        closest_point = None
        closest_dist = None

        for point in points:
            dist = distance_in_feet(
                player["latitude"],
                player["longitude"],
                point["latitude"],
                point["longitude"]
            )

            # If the current distance to a point is less than the closest distance
            # for a previous assigned point, re-assign it
            # If there is nothing closer, assign current cloest point
            if dist <= radius_ft and (closest_dist is None or dist < closest_dist):
                closest_dist = dist
                closest_point = point

        if closest_point:
            assignments[closest_point["id"]].append(player)

    return assignments

def resolve_point_state(conn, point, players, game_id):
    if not players:
        print("No players near this point")
        return

    # Organize players by their team affilations
    team_counts = {}
    for p in players:
        team = p["team_id"]
        team_counts[team] = team_counts.get(team, 0) + 1

    print(f"      Team presence at point: {point["poinf_id"]}")
    for team, count in team_counts.items():
        print(f"       Team {team}: {count} player(s)")

    sorted_teams = sorted(team_counts.items(), key=lambda x: x[1], reverse=True)

    winning_team, winning_count = sorted_teams[0]
    second_count = sorted_teams[1][1] if len(sorted_teams) > 1 else 0

    print(f"        Winning team: {winning_team}")
    print(f"        Winning count: {winning_count}")
    print(f"        Second count: {second_count}")

    # Rallying of teams around a point.

    # In this scenerio, ownership does not flip, but the amount of attackers & defenders does
    # Should only be ran if the current team owner is the most present around a point
    if ((winning_team == point["team_id"] and (winning_count > point["defenders"]))):

        conn.execute("""
            UPDATE points
            SET defenders = ?, attackers = ?
            WHERE id = ?
        """, (winning_count, second_count, point["id"]))
        return
    
    # Used for a more active game, where a point is actively being contest 
    # but defenders are present and outnumbering attackers
    if(second_count > point["attackers"]):
        conn.execute("""
            UPDATE points
            SET attackers = ?
            WHERE id = ?
        """, (second_count, point["id"]))
        return
    
    # A different outcome, this time the defending team is not the most around a point, 
    # but still has defenders from a previous capture. Here, the winning team's count goes toward the attackers
    if((winning_team != point["team_id"]) and (winning_count <= point["defenders"]) and (winning_count > point["attackers"])):

        conn.execute("""
            UPDATE points
            SET attackers = ?
            WHERE id = ?
        """, (winning_count, point["id"]))
        return

    # Capturing a point:
    # This occurs when a team outnumbers the defenders of the point
    # And also the winning team is not the current point's owners.
    if (winning_count > point["defenders"] and winning_team != point["team_id"]):

        conn.execute("""
            UPDATE points
            SET
                captured = 1,
                team_id = ?,
                attackers = 0,
                defenders = ?
            WHERE id = ?
        """, (winning_team, winning_count, point["id"]))

        award_point_for_capture(conn, winning_team, game_id)
        return

def award_point_for_capture(conn, winning_team, game_id):
    conn.execute("""
        UPDATE teams
        SET
            score = score + 1
        WHERE
            team_id = ? AND game_id = ?
    """, (winning_team, game_id)) 
    return

# Takes in game ID and collects all users and points related to that game
def evaluate_game_state(game_id):
    conn = get_db_connection()

    # We want users who have been active within the last two hours
    cutoff = datetime.utcnow() - timedelta(hours=2)

    players = [
        dict(r) for r in conn.execute("""
            SELECT *
            FROM positions
            WHERE game_id = ? AND timestamp >= ?
        """, (game_id, cutoff)).fetchall()
    ]

    points = [
        dict(r) for r in conn.execute("""
            SELECT *
            FROM points
            WHERE game_id = ?
        """, (game_id,)).fetchall()
    ]

    # Assign players to points closest to them
    assignments = assign_players_to_points(players, points)

    for point in points:
        print("   *" + point["point_id"])
        assigned_players = assignments.get(point["id"], [])
        
        for player in assigned_players:
            print( f"     * {player["user_id"]} | {player["team_id"]} | lat: {player["latitude"]} | long: {player["longitude"]}")
    
        resolve_point_state(conn, point, assigned_players, game_id)


    conn.commit()
    conn.close()

# Scheduled functions for passive game activity
def bonus_for_teams_holding_points(game_id):
    conn = get_db_connection()

    points = [
        dict(r) for r in conn.execute("""
            SELECT *
            FROM points
            WHERE game_id = ?
        """, (game_id,)).fetchall()
    ]

    for point in points:
        holding_team = point["team_id"]

        if holding_team != "NOBODY":
            conn.execute("""
                UPDATE teams 
                SET score = score + 1 
                WHERE game_id = ? AND team_id = ?
            """, (game_id, holding_team))

    conn.commit()
    conn.close()

def lower_point_defenders_overtime(game_id):
    conn = get_db_connection()

    points = [
        dict(r) for r in conn.execute("""
            SELECT *
            FROM points
            WHERE game_id = ?
        """, (game_id,)).fetchall()
    ]

    for point in points:
        defenders = point["defenders"]

        if defenders > 0:
            conn.execute("""
                UPDATE points 
                SET defenders = defenders - 1 
                WHERE game_id = ? AND point_id = ?
            """, (game_id, point["point_id"]))

    conn.commit()
    conn.close()

def lower_point_attackers_overtime(game_id):
    conn = get_db_connection()

    points = [
        dict(r) for r in conn.execute("""
            SELECT *
            FROM points
            WHERE game_id = ?
        """, (game_id,)).fetchall()
    ]

    for point in points:
        attackers = point["attackers"]

        if attackers > 0:
            conn.execute("""
                UPDATE points 
                SET attackers = 0
                WHERE game_id = ? AND point_id = ?
            """, (game_id, point["point_id"]))

    conn.commit()
    conn.close()