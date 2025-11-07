let latitude
let longitude

const pathParts = window.location.pathname.split('/');
console.log(pathParts)
const game_id = pathParts[pathParts.length - 1];

const displayLocation = document.getElementById("local")

window.onload = () => {
    document.getElementById('game-title').innerHTML = 'Game: ' + game_id;
    getLocation();
    displaySelectableTeams();
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
    latitude = position.coords.latitude;
    longitude = position.coords.longitude;
    displayLocation.innerText = `Latitude: ${latitude} --- Longitude: ${longitude}`;
    console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);
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