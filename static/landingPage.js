
// on page load, make a get request
document.addEventListener("DOMContentLoaded", () => {
    getGames();
    checkAuth();
    setupAuthUI();
});

async function getGames() {
                // Fetch the game data from your local API
                fetch('/games')
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
                            link.href = `/display_game/${game.game_id}`;
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

let authMode = "login";

function setupAuthUI() {
    document.getElementById("login-btn").onclick = () => openAuth("login");
    document.getElementById("register-btn").onclick = () => openAuth("register");
    document.getElementById("auth-cancel").onclick = closeAuth;
    document.getElementById("auth-submit").onclick = submitAuth;

    document.getElementById("logout-btn").onclick = async () => {
        await fetch("/logout", {
            method: "POST",
            credentials: "include"
        });
        location.reload();
    };
}

function openAuth(mode) {
    authMode = mode;
    document.getElementById("auth-form").style.display = "block";
}

function closeAuth() {
    document.getElementById("auth-form").style.display = "none";
}

async function submitAuth() {
    const username = document.getElementById("auth-username").value;
    const password = document.getElementById("auth-password").value;

    if (!username || !password) {
        alert("Username and password required");
        return;
    }

    const endpoint = authMode === "login" ? "/login" : "/register";

    const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password })
    });

    if (res.ok) {
        location.reload();
    } else {
        alert("Authentication failed");
    }
}

async function checkAuth() {
    const res = await fetch("/auth/status", {
        credentials: "include"
    });
    const data = await res.json();

    if (data.authenticated) {
        document.getElementById("user-display").innerText =
            `Logged in as ${data.username}`;
        document.getElementById("user-display").style.display = "inline";

        document.getElementById("logout-btn").style.display = "inline";
        document.getElementById("login-btn").style.display = "none";
        document.getElementById("register-btn").style.display = "none";
    }
}