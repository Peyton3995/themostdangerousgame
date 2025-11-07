const pathParts = window.location.pathname.split('/');
const game_id = pathParts[2];
const user_id = pathParts[3];

const displayLocation = document.getElementById("local")

window.onload = () => {
    document.getElementById('game-title').innerHTML = 'Game: ' + game_id;
    document.getElementById('user').innerHTML = 'User: ' + user_id;
    getLocation();
    loadGamePositions();
}

async function getLocation() {
    if (navigator.geolocation) {
        console.log("estimating user position...")
        displayLocation.innerHTML = 'Latitude: YY.yyyyyy --- Longitude: XX.xxxxxx'
        navigator.geolocation.getCurrentPosition(success, error);
    } else { 
        console.log("Geolocation is not supported by this browser.");
    }
}
    
async function success(position) {
    const new_latitude = position.coords.latitude;
    const new_longitude = position.coords.longitude;
    displayLocation.innerText = `Latitude: ${new_latitude} --- Longitude: ${new_longitude}`;
    console.log(`Latitude: ${new_latitude}, Longitude: ${new_longitude}`);

    updateUserPosition(new_latitude, new_longitude)
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

async function loadGamePositions() {
    document.getElementById('game-title').textContent = 'Game: ' + game_id;

    const playersBody = document.querySelector('#players-table tbody');
    const pointsBody = document.querySelector('#points-table tbody');

    // Fetch player positions
    fetch(`https://themostdangerousgame.net/positions/${game_id}`)
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
                    <td>${p.latitude}</td>
                    <td>${p.longitude}</td>
                    <td>${p.timestamp}</td>
                    <td><a href="https://themostdangerousgame.net/join/${game_id}/${p.user_id}">  Use  </a></td>
                `;
                playersBody.appendChild(row);
            });
        })
        .catch(() => {
            playersBody.innerHTML = '<tr><td colspan="4">Failed to load player data.</td></tr>';
        }
    );

    // Fetch point locations
    fetch(`https://themostdangerousgame.net/points/${game_id}`)
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

async function updateUserPosition(new_lat, new_long) {
    const response = await fetch(`https://themostdangerousgame.net/positions/${user_id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
            body: JSON.stringify({
            latitude: new_lat,
            longitude: new_long
        })
    });

    console.log(response)
}