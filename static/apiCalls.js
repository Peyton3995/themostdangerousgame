window.onload = () => {
    displaySelectableGames()
}

async function submitGame() {
            const game_id = document.getElementById('game_id').value.trim();
            const latitude = document.getElementById('game_latitude').value.trim();
            const longitude = document.getElementById('game_longitude').value.trim();


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
    const game_id = document.getElementById('games').value;
    const latitude = document.getElementById('point_latitude').value.trim();
    const longitude = document.getElementById('point_longitude').value.trim();


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

    if(response.ok){
        windows.reload()
    }
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
        const dropdown = document.getElementById('games');
        dropdown.innerHTML = ''; // Clear the "Loading..." option

        // Assuming your API returns a list of objects with a 'game_id' field
        data.forEach(game => {
          const option = document.createElement('option');
          option.value = game.game_id;
          option.textContent = game.game_id;
          dropdown.appendChild(option);
        });
      })
      .catch(error => {
        console.error('Error fetching games:', error);
        const dropdown = document.getElementById('games');
        dropdown.innerHTML = '<option>Error loading games</option>';
      });
}