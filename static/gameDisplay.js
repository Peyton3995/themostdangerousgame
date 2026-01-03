// on page load, make a get request

let game_id;

window.onload = () => {
    const pathParts = window.location.pathname.split('/');
    game_id = pathParts[pathParts.length - 1];
    
    loadGamePositions();
}

async function loadGamePositions() {

    let game_name
    fetch(`/games/${game_id}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById("game-title").innerText = data.name;
        }).catch(() => {
            window.location.href = `/`
        })

    const playersBody = document.querySelector('#players-table tbody');
    const pointsBody = document.querySelector('#points-table tbody');
    const teamsBody = document.querySelector('#teams-table tbody');

    // Fetch player positions
    fetch(`/positions/${game_id}`)
        .then(response => response.json())
        .then(data => {
            playersBody.innerHTML = '';
            if (data.length === 0) {
                playersBody.innerHTML = '<tr><td colspan="4">No player data available.</td></tr>';
                return;
            }
            data.forEach(p => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${p.user_id}</td>
                    <td>${p.team_id}</td>
                    <td>${p.timestamp}</td>
                    <td><a href="/join/${game_id}/${p.user_id}">  Use  </a></td>
                `;
                playersBody.appendChild(row);
            });
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
        }
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

