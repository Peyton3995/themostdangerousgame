const pathParts = window.location.pathname.split('/');
const game_id = pathParts[2];
const user_id = pathParts[3];

let user_latitude;
let user_longitude;

let gamePoints;
let playerData;

const displayLocation = document.getElementById("local")

window.onload = () => {
    document.getElementById('game-title').innerHTML = 'Game: ' + game_id;
    document.getElementById('user').innerHTML = 'User: ' + user_id;
    getLocation();
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

    user_latitude = new_latitude;
    user_longitude = new_longitude;

    displayLocation.innerText = `Latitude: ${new_latitude} --- Longitude: ${new_longitude}`;
    console.log(`Latitude: ${new_latitude}, Longitude: ${new_longitude}`);

    // a successful call will then populate all the tables
    // this prevents race conditions
    loadGamePositions()
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

            playerData = data;
            console.log(data)

            data.forEach(p => {
                if(p.user_id !== user_id) {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                    <td>${p.user_id}</td>
                    <td>${p.team_id}</td>
                    <td>${p.latitude}</td>
                    <td>${p.longitude}</td>
                    <td>${p.timestamp}</td>
                    <td>${distanceInFeet(user_latitude, user_longitude, p.latitude, p.longitude)}</td>
                    `;
                    playersBody.appendChild(row);
                }
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

        gamePoints = data
        console.log(data);

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
        })
        .catch(() => {
            pointsBody.innerHTML = `<tr><td colspan="5">${gamePoints[0].point_id}</td></tr>`;
        }
    )
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

async function updatePoint(captured, defenders, attackers, team_id, point_id){
    const response = await fetch(`https://themostdangerousgame.net/points/${game_id}/${point_id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
            body: JSON.stringify({
                captured: captured,
                defenders: defenders,
                attackers: attackers,
                team_id: team_id,
                point_id: point_id,
                game_id: game_id
            })
    })

    console.log(response) 
}

function distanceInFeet(lat1, lon1, lat2, lon2) {
    const R = 6371000; // radius of the earth in meters
    const toRad = angle => angle * (Math.PI / 180);

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceMeters = R * c;
    const distanceFeet = distanceMeters * 3.28084; // converting meters to feet

    return (Math.trunc(distanceFeet * 1000) / 1000); // trunc to thousandths place
}

function findNearestPoint() {
    console.log(gamePoints)
    // append distance to each one
    const distanceToPoints = gamePoints.map(d => ({
        ...d,
        distance: distanceInFeet(user_latitude, user_longitude, d.latitude, d.longitude)
    }));
    console.log(distanceToPoints)

    // iterate again through fields, looking for one within a hundred feet
    const within100Feet = distanceToPoints.filter(u => u.distance < 100);
    console.log((within100Feet))

    // array for storing closest points
    let closestPoint = []

    // incase there are more than 1 point within a hundred feet, sort for the closest one
    if(within100Feet.length > 0) {
        const closest = within100Feet.reduce((min, curr) =>
            curr.distance < min.distance ? curr : min
        );
        closestPoint.push(closest);
    }

    console.log(closestPoint)

    if(closestPoint.length > 0) {
        findClosePlayers(closestPoint[0].point_id, closestPoint[0].latitude, closestPoint[0].longitude)

        document.getElementById('test').innerHTML = closestPoint[0].point_id;
    }
}

function findClosePlayers(point, point_latitude, point_longitude) {
    // find recent players, movement made in the last two hours
    const recentPlayers = playerData.filter(p => {
        const playerTime = new Date(p.timestamp.replace(' ', 'T')); // Convert to ISO format
        const timeDiffHours = (now - playerTime) / (1000 * 60 * 60);
        return timeDiffHours <= 2; // within 2 hours
    });

    // append distance player json object
    console.log(recentPlayers)
    const distanceToPoint = recentPlayers.map(p => ({
        ...p,
        distance: distanceInFeet(point_latitude, point_longitude, p.latitude, p.longitude)
    }));
    console.log(distanceToPoint)

    // find players within a hundred feet of the point
    const within100FeetAndTwoHoursAgo = distanceToPoint.filter(p => p.distance < 100)
    console.log(within100FeetAndTwoHoursAgo)

    // we have all the information we need, now go to seeing if this point can be captured
    capturingAPoint(point, within100FeetAndTwoHoursAgo)
}

function capturingAPoint(closePoint, closePlayers) {
    const matchedPoint = gamePoints.find(point => point.point_id === closePoint);

    let topTeam = null;
    let maxCount = 0;
    let secondCount = 0;

    const teams = {}; // hold team
    closePlayers.forEach(player => {
        const team = player.team_id;
        if (!teams[team]) {
            teams[team] = [];
        }
        teams[team].push(player);
    });

    // if point is unclaimed, give it to the team with the most present players
    if(matchedPoint.team_id === "NOBODY"){
        // Create an array of { team, count }
        const teamCounts = Object.entries(teams).map(([team, players]) => ({
            team,
            count: players.length
        }));

        teamCounts.sort((a, b) => b.count - a.count);

        topTeam = teamCounts[0]?.team || null;
        topCount = teamCounts[0]?.count || 0;
        secondCount = teamCounts[1]?.count || 0;

        console.log("Top team:", topTeam, "Count:", topCount);
        console.log("Second team count:", secondCount);

        if (topCount === secondCount) {
            console.log("Capture blocked — tie between top teams.");
            return;
        } else {
            updatePoint(1, maxCount, secondCount, topTeam, matchedPoint.point_id)
        }
    }
}