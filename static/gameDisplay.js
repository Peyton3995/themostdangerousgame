import {findCurrentUserPosition, distanceInFeet, findClosePlayers, findNearestPoint} from "./gameFunctions.js"
// on page load, make all get requests

let game_id;
let is_joined = false;

document.getElementById("join-button").addEventListener("click", joinGame);

let user_longitude;
let user_latitude;

window.onload = () => {
    const pathParts = window.location.pathname.split('/');
    game_id = pathParts[pathParts.length - 1];
    
    checkAuthStatus();
}

async function loadGamePositions() {

    fetch(`/games/${game_id}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById("game-title").innerText = data.name;
        }).catch(() => {
            window.location.href = `/`
        }
    )

    const playersBody = document.querySelector('#players-table tbody');
    const pointsBody = document.querySelector('#points-table tbody');
    const teamsBody = document.querySelector('#teams-table tbody');

    // Fetch player positions
    fetch(`/positions/${game_id}`)
        .then(response => response.json())
        .then(data => {
            playersBody.innerHTML = '';
            if (data.length === 0 && !is_joined) {
                playersBody.innerHTML = '<tr><td colspan="4">No player data available.</td></tr>';
                return;
            }
            else if(!is_joined) {
                data.forEach(p => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${p.user_id}</td>
                    <td>${p.team_id}</td>
                    <td>${p.timestamp}</td>
                `;
                playersBody.appendChild(row);
                });
            } else {
                data.forEach(p => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                    <td>${p.user_id}</td>
                    <td>${p.team_id}</td>
                    <td>${p.timestamp}</td>
                    <td>${distanceInFeet(user_latitude, user_longitude, p.latitude, p.longitude)}</td>`;
                    playersBody.appendChild(row);
                });
            }
        })
        .catch(() => {
            playersBody.innerHTML = '<tr><td colspan="4">Failed to load player data.</td></tr>';
        }
    );

    // Fetch point locations
    fetch(`/points/${game_id}`)
        .then(response => response.json())
        .then(data => {
        pointsBody.innerHTML = '';
        if (data.length === 0) {
            pointsBody.innerHTML = '<tr><td colspan="5">No points available.</td></tr>';
            return;
        } else if(!is_joined) {
            data.forEach(point => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${point.point_id}</td>
                    <td>${point.latitude}</td>
                    <td>${point.longitude}</td>
                    <td>${point.team_id}</td>
                    <td>${point.defenders}</td>
                    <td>${point.timestamp}</td>
                `;
                pointsBody.appendChild(row);
            });
        } else {
            data.forEach(point => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${point.point_id}</td>
                    <td>${point.latitude}</td>
                    <td>${point.longitude}</td>
                    <td>${point.team_id}</td>
                    <td>${point.defenders}</td>
                    <td>${point.timestamp}</td>
                    <td>${distanceInFeet(user_latitude, user_longitude, point.latitude, point.longitude)}</td>
                `;
                pointsBody.appendChild(row);
            });
        } 
        
        })
        .catch(() => {
            pointsBody.innerHTML = '<tr><td colspan="5">Failed to load point data.</td></tr>';
        }
    );

    // Fetch team locations
    fetch(`/teams/${game_id}`)
        .then(response => response.json())
        .then(data => {
        teamsBody.innerHTML = '';
        if (data.length === 0) {
            teamsBody.innerHTML = '<tr><td colspan="5">No points available.</td></tr>'
            return;
        }
        data.forEach(team => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${team.team_id}</td>
                <td>${team.score}</td>
            `;
            teamsBody.appendChild(row)
        })
        })
        .catch(() => {
            teamsBody.innerHTML = '<tr><td colspan="5">Failed to load team data.</td></tr>'
        }
    );
}

async function loadTeamsForJoin() {
    const res = await fetch(`/teams/${game_id}`);
    const teams = await res.json();

    const select = document.getElementById("join-team");
    select.innerHTML = `<option value="">Select a team</option>`;

    teams.forEach(team => {
        const option = document.createElement("option");
        option.value = team.team_id;
        option.textContent = team.team_id;
        select.appendChild(option);
    });
}

async function checkJoinStatus() {
    const res = await fetch(`/position/${game_id}`, {
        credentials: "include"
    });

    if (!res.ok) return;

    const data = await res.json();

    if (data.joined) {
        document.getElementById("play-container").style.display = "block";
        document.getElementById("join-container").style.display = "none";
        document.getElementById("edit-game").style.display = "inline"
        document.getElementById("edit-link").href = `/add_game/${game_id}`
        is_joined = true
        addDistanceColumnHeader()

        let currentPosition = await findCurrentUserPosition()

        user_latitude = currentPosition.latitude
        user_longitude = currentPosition.longitude
    } else {
        document.getElementById("join-container").style.display = "block";
        document.getElementById("play-container").style.display = "none";
        loadTeamsForJoin();
    }
    loadGamePositions()
}

async function joinGame() {
    const team = document.getElementById("join-team").value;

    if (!team) {
        alert("Select a team");
        return;
    }

    const current_position = await findCurrentUserPosition()

    const res = await fetch("/positions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                game_id: game_id,
                team_id: team,
                latitude: current_position.latitude,
                longitude: current_position.longitude
            })
        });

    if (!res.ok) {
        alert("Failed to join game");
        console.log(game_id)
        console.log(team)
        console.log(current_position.latitude)
        console.log(current_position.longitude)
        return;
    } else {
        loadGamePositions();
        checkJoinStatus();
    }
}

async function checkAuthStatus() {
    const res = await fetch("/auth/status", {
        credentials: "include"
    });

    if (!res.ok) return;

    const data = await res.json();

    if (data.authenticated) {
        document.getElementById("user-display").innerText =
            `Logged in as ${data.username}`;
        document.getElementById("user-display").style.display = "inline";
        document.getElementById("logout-btn").style.display = "inline";

        checkJoinStatus();
    } else {
        loadGamePositions();
    }
}

document.getElementById("logout-btn").onclick = async () => {
    await fetch("/logout", {
        method: "POST",
        credentials: "include"
    });
    window.location.href = "/";
}

function addDistanceColumnHeader() {
    const headerUserRow = document.querySelector("#players-table thead tr");
    const headerPointRow = document.querySelector("#points-table thead tr")

    const th_users = document.createElement("th");
    th_users.id = "distance-header-users";
    th_users.innerText = "Distance (ft)";
    
    headerUserRow.appendChild(th_users)

    const th_points = document.createElement("th");
    th_points.id = "distance-header-users";
    th_points.innerText = "Distance (ft)";

    headerPointRow.appendChild(th_points)
}