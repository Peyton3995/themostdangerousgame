export function findCurrentUserPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation is not supported by this browser."));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            position => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            },
            error => {
                reject(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
}

export function distanceInFeet(lat1, lon1, lat2, lon2) {
    console.log(lat1)
    console.log(lon1)
    console.log(lat2)
    console.log(lon2)
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

export function findNearestPoint() {
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

export function findClosePlayers(point, point_latitude, point_longitude) {
    // current utc timestamp 
    const now = new Date();

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

export async function capturingAPoint(closePoint, closePlayers) {
    const matchedPoint = gamePoints.find(point => point.point_id === closePoint);
    console.log(matchedPoint)

    let teamCounts = {};

    closePlayers.forEach(obj => {
        const team = obj.team_id;
        teamCounts[team] = (teamCounts[team] || 0) + 1;
    });

    console.log(teamCounts)

    const entries = Object.entries(teamCounts)

    if (entries.length === 0) {
        return { winningTeam: null, winningCount: 0, secondCount: 0 };
    }

    // Sort descending by count
    entries.sort((a, b) => b[1] - a[1]);

    const winningTeam = entries[0][0];
    console.log(winningTeam)
    const winningCount = entries[0][1];
    console.log(winningCount)
    const secondCount = entries[1] ? entries[1][1] : 0;
    console.log(secondCount)

    if((matchedPoint.defenders < winningCount) && (winningCount !== secondCount)){
        console.log("updating point")
        updatePoint(1, winningCount, secondCount, winningTeam, matchedPoint.point_id)
    }
}

export function updateScores(winningTeam) {
    console.log(winningTeam)
    // get winning team out of teamScores
    let awardedTeam = teamScores.find(team => team.team_id === winningTeam);

    // get winning teams current score and bump it by 1
    let awardedPoints = awardedTeam.points + 1;

    // put new score
    updateTeamScore(winningTeam, awardedPoints)
}

async function updateTeamScore(team_id, score){
    const response = await fetch(`/teams/${game_id}/${team_id}`, {
        method: 'PUT',
        headers: {
            'Content-Type':'application/json'
        },
            body: JSON.stringify({
                points: score
            })
    })

    console.log(response)
}