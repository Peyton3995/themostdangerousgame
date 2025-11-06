window.onload = () => {
    displaySelectableGames()
    getLocation()
}

// store latitude and longitude of user here for all post functions to use
let latitude;
let longitude;

const displayLocation = document.getElementById("local")

async function submitGame() {
    const game_id = document.getElementById('game_id').value.trim();

    if (!game_id || !latitude || !longitude) {
        document.getElementById('response').innerText = "All fields must be filled..."
        return;
    }

    if (isNaN(latitude) || isNaN(longitude)) {
        document.getElementById('response').innerText = "Latitude and longitude must be numbers..."
        return;
    }

    const response = await fetch('https://themostdangerousgame.net/games', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
            body: JSON.stringify({
            game_id: game_id,
            latitude: latitude,
            longitude: longitude
        })
    });

    const result = await response.json();
    document.getElementById('response').innerText = JSON.stringify(result);
}

async function submitPoint() {
    const point_id = document.getElementById('point_id').value.trim()
    const game_id = document.getElementById('games_points').value;
    const point_latitude = document.getElementById('point_lat').value.trim()
    const point_longitude = document.getElementById('point_long').value.trim()


    if (!game_id || !point_id || !point_latitude || !point_longitude) {
        document.getElementById('response').innerText = "All fields must be filled..."
        return;
    }

    if(isNaN(point_latitude) || isNaN(point_longitude)){
        document.getElementById('response').innerText = "Enter latitude and longitude need to be numbers..."
        return;
    }

    const response = await fetch('https://themostdangerousgame.net/points', {
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
    document.getElementById('response').innerText = JSON.stringify(result);
}

async function submitTeam() {
    const team_id = document.getElementById('team_id').value.trim()
    const game_id = document.getElementById('games_teams').value;

    const response = await fetch('https://themostdangerousgame.net/teams', {
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
    document.getElementById('response').innerText = JSON.stringify(result);
}

async function submitUser() {
    const user_id = document.getElementById('user_id').value.trim()
    const team_id = document.getElementById('teams').value;
    const game_id = document.getElementById('games_teams').value;

    const user_latitude = latitude;
    const user_longitude = longitude;

    const response = await fetch('https://themostdangerousgame.net/teams', {
        method: 'POST',
        headers: {
                'Content-Type': 'application/json'
        },
            body: JSON.stringify({
            user_id: user_id,
            team_id: team_id,
            game_id: game_id,
            latitude: user_latitude,
            longitude: user_longitude
        })
    });

    const result = await response.json();
    document.getElementById('response').innerText = JSON.stringify(result);
}

async function displaySelectableGames() {
    fetch('https://themostdangerousgame.net/games')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        const dropdown_points = document.getElementById('games_points');
        dropdown_points.innerHTML = '';
        data.forEach(game => {
            const option = document.createElement('option');
            option.value = game.game_id;
            option.textContent = game.game_id;
            dropdown_points.appendChild(option);
        });

        const dropdown_teams = document.getElementById('games_teams');
        dropdown_teams.innerHTML = '';
        data.forEach(game => {
            const option = document.createElement('option');
            option.value = game.game_id;
            option.textContent = game.game_id;
            dropdown_teams.appendChild(option);
        });

        const dropdown_users = document.getElementById('games_users');
        dropdown_users.innerHTML = '';
        data.forEach(game => {
            const option = document.createElement('option');
            option.value = game.game_id;
            option.textContent = game.game_id;
            dropdown_users.appendChild(option);
        });

        displaySelectableTeams();
    })
    .catch(error => {
        console.error('Error fetching games:', error);
        const dropdown_points = document.getElementById('games_points');
        const dropdown_teams = document.getElementById('games_teams');
        const dropdown_users = document.getElementById("games_users")
        dropdown_points.innerHTML = '<option>Error loading games</option>';
        dropdown_teams.innerHTML = '<option>Error loading games</option>';
        dropdown_users.innerHTML = '<option>Error loading games</option>';
    });
}

async function displaySelectableTeams(game) {

    // clear out the dropdown before each call
    document.getElementById("user_teams").innerHTML = "";

    fetch(`https://themostdangerousgame.net/teams/${game}`)
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        const dropdown_users = document.getElementById('user_teams');
        dropdown_users.innerHTML = '';
        data.forEach(game => {
            const option = document.createElement('option');
            option.value = game.team_id;
            option.textContent = game.team_id;
            dropdown_users.appendChild(option);
        });
    })
    .catch(error => {
        console.error('Error fetching games:', error);
        const dropdown_users = document.getElementById("user_teams")
        dropdown_users.innerHTML = '<option>Error loading games</option>';
    });
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