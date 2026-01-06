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

    print("Team presence at point:")
    for team, count in team_counts.items():
        print(f"     Team {team}: {count} player(s)")

    sorted_teams = sorted(team_counts.items(), key=lambda x: x[1], reverse=True)

    winning_team, winning_count = sorted_teams[0]
    second_count = sorted_teams[1][1] if len(sorted_teams) > 1 else 0

    print(f"Winning team: {winning_team}")
    print(f"Winning count: {winning_count}")
    print(f"Second count: {second_count}")

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

def evaluate_game_state(game_id):
    conn = get_db_connection()

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

    assignments = assign_players_to_points(players, points)

    for point in points:
        print("    " + point["point_id"])
        assigned_players = assignments.get(point["id"], [])
        
        for player in assigned_players:
            print( f"     {player["user_id"]} | {player["team_id"]} | lat: {player["latitude"]} | long: {player["longitude"]}")
    
        resolve_point_state(conn, point, assigned_players, game_id)


    conn.commit()
    conn.close()

