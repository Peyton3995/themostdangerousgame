let game_id
let stored_teams

document.addEventListener("DOMContentLoaded", () => {
    const pathParts = window.location.pathname.split('/');
    game_id = pathParts[pathParts.length - 1];

    getGameById(game_id)
    checkAuthStatus()
    loadPoints()
    loadTeams()
    loadUsers()
});

document.getElementById("access-code-submit").addEventListener("click", changeAccessCode);
document.getElementById("access-code-remove").addEventListener("click", removeAccessCode);

async function getGameById(game_id) {
    const res = await fetch(`/games/${game_id}`);

    if (!res.ok) {
        window.location.href = `/`;
        return
    }

    const game = await res.json();
    document.getElementById("game-title").innerText = "You're editing " + game.name;
}

async function submitPoint() {
    const point_id = document.getElementById('point_id').value.trim()
    const point_latitude = document.getElementById('point_lat').value.trim()
    const point_longitude = document.getElementById('point_long').value.trim()


    if (!point_id || !point_latitude || !point_longitude) {
        document.getElementById('response').innerText = "All fields must be filled..."
        return;
    }

    if(isNaN(point_latitude) || isNaN(point_longitude)){
        document.getElementById('response').innerText = "Enter latitude and longitude need to be numbers..."
        return;
    }

    const response = await fetch('/points', {
        method: 'POST',
        headers: {
                'Content-Type': 'application/json'
        },
            body: JSON.stringify({
            point_id: point_id,
            game_id: game_id,
            latitude: point_latitude,
            longitude: point_longitude
        })
    });

    const result = await response.json();
    loadPoints()
    document.getElementById('response').innerText = JSON.stringify(result);
}

async function submitTeam() {
    const team_id = document.getElementById('team_id').value.trim()

    if (!game_id || !team_id) {
        document.getElementById('response').innerText = "All fields must be filled..."
        return;
    }

    const response = await fetch('/teams', {
        method: 'POST',
        headers: {
                'Content-Type': 'application/json'
        },
            body: JSON.stringify({
            team_id: team_id,
            game_id: game_id
        })
    });

    const result = await response.json();
    loadTeams();
    document.getElementById('response').innerText = JSON.stringify(result);
}

async function loadTeams() {
    const res = await fetch(`/teams/${game_id}`);
    const teams = await res.json();
    stored_teams = teams

    const tbody = document.getElementById("teams-body");
    tbody.innerHTML = "";

    if (teams.length === 0) {
        tbody.innerHTML = "<tr><td colspan='2'>No teams yet</td></tr>";
        return;
    }

    teams.forEach(team => {
        const row = document.createElement("tr");

        const nameCell = document.createElement("td");
        nameCell.innerText = team.team_id;

        const actionCell = document.createElement("td");
        const delBtn = document.createElement("button");
        delBtn.innerText = "Delete";
        delBtn.onclick = () => deleteTeam(team.team_id);

        actionCell.appendChild(delBtn);

        row.appendChild(nameCell);
        row.appendChild(actionCell);
        tbody.appendChild(row);
    });
}

async function changeAccessCode() {
    const accessCode = document.getElementById("access-code").value

    await fetch(`/games/${game_id}/${accessCode}`, {
        method: "PUT"
    })
}

async function removeAccessCode() {
    document.getElementById("access-code").value = ""
    await fetch(`/games/${game_id}`, {
        method: "PUT"
    })
}


async function deleteTeam(team_id) {
    if (!confirm(`Delete team "${team_id}"?`)) return;

    await fetch(`/teams/${game_id}/${team_id}`, {
        method: "DELETE"
    });

    loadTeams()
    loadUsers()
}

async function loadPoints() {
    const res = await fetch(`/points/${game_id}`);
    const points = await res.json();

    const tbody = document.getElementById("points-body");
    tbody.innerHTML = "";

    if (points.length === 0) {
        tbody.innerHTML = "<tr><td colspan='4'>No points yet</td></tr>";
        return;
    }

    points.forEach(point => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${point.point_id}</td>
            <td>${point.latitude}</td>
            <td>${point.longitude}</td>
            <td>
                <button onclick="deletePoint(${point.id})">Delete</button>
            </td>
        `;

        tbody.appendChild(row);
    });
}

async function deletePoint(point_id) {
    if (!confirm(`Are you sure you want to delete this point?`)) return;

    await fetch(`/points/${point_id}`, {
        method: "DELETE"
    });

    loadPoints();
}

async function loadUsers() {
    const playersBody = document.querySelector('#players-table tbody');
    fetch(`/positions/${game_id}`)
        .then(response => response.json())
        .then(data => {
            playersBody.innerHTML = '';
            if (data.length === 0 && !is_joined) {
                playersBody.innerHTML = '<tr><td colspan="4">No player data available.</td></tr>';
                return;
            }        
            data.forEach(p => {
                const teamOptions = stored_teams.map(team =>
                    `<option value="${team.team_id}" ${team.team_id === p.team_id ? "selected" : ""}>
                    ${team.team_id}
                    </option>`
                ).join("");
                const row = document.createElement('tr');
                row.innerHTML = `
                <td>${p.user_id}</td>
                <td>${p.latitude}</td>
                <td>${p.longitude}</td>
                <td>
                    <select onchange="changeUserTeam('${p.user_id}', this.value, ${p.latitude}, ${p.longitude}, ${game_id})">
                        <option value="">No Team</option>
                        ${teamOptions}
                    </select>
                </td>
                </td>
                <td>${p.timestamp}</td>
                <td>
                    <button onclick="deleteUser('${p.user_id}')">Kick</button>
                </td>`
                playersBody.appendChild(row);
            });
        })
        .catch(() => {
            playersBody.innerHTML = '<tr><td colspan="4">Failed to load player data.</td></tr>';
        }
    );
}

async function deleteUser(user_id) {

    await fetch(`/positions/${game_id}/${user_id}`, {
        method: "DELETE"
    });

    loadUsers();
}

async function changeUserTeam(user_id, team_id, latitude, longitude, game_id) {
    await fetch(`/positions/${game_id}/${user_id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            user_id: user_id,
            game_id: game_id,
            team_id: team_id,
            latitude: latitude,
            longitude: longitude
        })
    });

    loadUsers();
}

async function deleteGame(){
    window.location.href = "/";
    await fetch(`/games/${game_id}`, {
        method: "DELETE"
    })
}

async function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(success, error);
    } else { 
        console.log("Geolocation is not supported by this browser.");
    }
}
    
async function success(position) {
    document.getElementById('point_lat').value = position.coords.latitude
    document.getElementById('point_long').value = position.coords.longitude
}

function error(error) {
    switch(error.code) {
        case error.PERMISSION_DENIED:
            console.log("User denied the request for Geolocation.");
            break;
        case error.POSITION_UNAVAILABLE:
            console.log("Location information is unavailable.");
            break;
        case error.TIMEOUT:
            console.log("The request to get user location timed out.");
            break;
        case error.UNKNOWN_ERROR:
            console.log("An unknown error occurred.");
            break;
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
        document.getElementById("view-game").href = `/display_game/${game_id}`
    }
}

document.getElementById("logout-btn").onclick = async () => {
    await fetch("/logout", {
        method: "POST",
        credentials: "include"
    });
    window.location.href = "/";
};