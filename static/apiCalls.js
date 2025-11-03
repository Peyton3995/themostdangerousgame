async function submitGame() {
            const game_id = document.getElementById('game_id').value.trim();
            const latitude = document.getElementById('latitude').value.trim();
            const longitude = document.getElementById('longitude').value.trim();


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
    const game_id = document.getElementById('game_id').value.trim();
    const latitude = document.getElementById('latitude').value.trim();
    const longitude = document.getElementById('longitude').value.trim();


    if (!game_id || !point_id || !latitude || !longitude) {
        document.getElementById('response').innerText = "All fields must be filled..."
        return;
    }

    if (isNaN(latitude) || isNaN(longitude)) {
        document.getElementById('response').innerText = "Latitude and longitude must be numbers..."
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
            latitude: latitude,
            longitude: longitude
        })
    });

    const result = await response.json();
    document.getElementById('response').innerText = JSON.stringify(result);
}