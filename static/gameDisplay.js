// on page load, make a get request
window.onload = () => {
    loadGamesPositions();
}

async function loadGamePositions() {
    const pathParts = window.location.pathname.split('/');
    const gameId = pathParts[pathParts.length - 1];
    document.getElementById('game-title').textContent = 'Game: ' + gameId;

    const playersBody = document.querySelector('#players-table tbody');
    const pointsBody = document.querySelector('#points-table tbody');

    // Fetch player positions
    fetch(`https://themostdangerousgame.net/positions/${gameId}`)
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
                    <td>${p.latitude}</td>
                    <td>${p.longitude}</td>
                    <td>${p.timestamp}</td>
                `;
                playersBody.appendChild(row);
            });
        })
        .catch(() => {
            playersBody.innerHTML = '<tr><td colspan="4">Failed to load player data.</td></tr>';
        }
    );

    // Fetch point locations
    fetch(`https://themostdangerousgame.net/points/${gameId}`)
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
}

