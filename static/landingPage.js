
// on page load, make a get request
window.onload = () => {
    getGames();
}

async function getGames() {
                // Fetch the game data from your local API
                fetch('https://themostdangerousgame.net/games')
                    .then(response => response.json())
                    .then(data => {
                        const tbody = document.querySelector('tbody');
                        tbody.innerHTML = ''; // clear the "Loading..." row

                        if (data.length === 0) {
                            const row = document.createElement('tr');
                            const cell = document.createElement('td');
                            cell.colSpan = 5;
                            cell.textContent = 'No games available.';
                            row.appendChild(cell);
                            tbody.appendChild(row);
                            return;
                        }

                        // Create table rows
                        data.forEach(game => {
                            const row = document.createElement('tr');

                            const idCell = document.createElement('td');
                            idCell.textContent = game.game_id;

                            const latCell = document.createElement('td');
                            latCell.textContent = game.latitude;

                            const lonCell = document.createElement('td');
                            lonCell.textContent = game.longitude;

                            const dateCell = document.createElement('td');
                            dateCell.textContent = game.timestamp;

                            const joinCell = document.createElement('td');
                            const link = document.createElement('a');
                            link.href = `https://themostdangerousgame.net/display_game/${game.game_id}`;
                            link.textContent = 'View';
                            joinCell.appendChild(link);

                            row.appendChild(idCell);
                            row.appendChild(latCell);
                            row.appendChild(lonCell);
                            row.appendChild(dateCell);
                            row.appendChild(joinCell);

                            tbody.appendChild(row);
                        });
                    })
                    .catch(error => {
                        console.error('Error fetching games:', error);
                        const tbody = document.querySelector('tbody');
                        tbody.innerHTML = '<tr><td colspan="5">Failed to load games.</td></tr>';
                    });
            };