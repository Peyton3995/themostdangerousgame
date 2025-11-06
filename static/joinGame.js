let latitude
let longitude

const pathParts = window.location.pathname.split('/');
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

async function joinGame() {
    const game_id = game_id;
    const user_id = document.getElementById('user_id').value;
    const team_id = document.getElementById('team_id').value;
    const latitude = latitude;
    const longitude = longitude;

    const response = await fetch('https://themostdangerousgame.net/positions', {
        method: 'POST',
        headers: {
                'Content-Type': 'application/json'
        },
            body: JSON.stringify({
                game_id: game_id,
                latitude: latitude,
                longitude: longitude,
                user_id: user_id,
                team_id: team_id
            })
        }
    );

    const result = await response.json();
    document.getElementById('response').innerText = JSON.stringify(result);
}


async function displaySelectableTeams() {
    fetch('https://themostdangerousgame.net/teams')
    .then(response => {
        if (!response.ok) {
            throw new Error(response);
        }
        return response.json();
    })
    .then(data => {
        const dropdown = document.getElementById('team_id');
        dropdown.innerHTML = '';
        data.forEach(team => {
            const option = document.createElement('option');
            option.value = team.team_id;
            option.textContent = team.team_id;
            dropdown.appendChild(option);
        });
    })
    .catch(error => {
        console.error('Error fetching games:', error);
        const dropdown = document.getElementById('team_id');
        dropdown.innerHTML = '<option>Error loading games</option>';
    });
}




