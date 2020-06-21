const socket = io();
let gameId = null;
let playerName = null;

const buzzer = document.getElementById('buzzer');
buzzer.addEventListener('touchstart', e => buzz());
buzzer.addEventListener('mousedown', e => buzz());

let isInGame = false;

function confirmExit() {
    if (isInGame && !confirm('Are you sure you want to quit?')) {
        return;
    }
    window.location.reload();
}

function updatePlayerList(players) {
    const playerList = document.getElementById('player-list');
    playerList.innerHTML = '';
    players.forEach(player => {
        const element = document.createElement('li');
        element.innerText = player.playerName;
        if (player.isBuzzed) {
            element.classList.add('buzzed');
        }
        if (player.isFrozen) {
            element.classList.add('frozen');
        }
        playerList.appendChild(element);
    });
}

// Client functions

function join() {
    playerName = document.getElementById("name-input").value;
    gameId = document.getElementById("gameid-input").value;
    if (playerName.length > 0 && gameId.length > 0) {
        socket.emit('join-request', { playerName, gameId }, (err, data) => {
            if (err) {
                alert(err);
            } else {
                setupPlayer(gameId);
                updatePlayerList(data.players);
            }
        });
    }
}

function setupPlayer(gameId) {
    isInGame = true;

    document.getElementById('game-id-display').innerText = gameId;
    document.getElementById('game-id-p').classList.remove('hidden');
    document.getElementById('player-name-display').innerText = playerName;
    document.getElementById('player-view').classList.remove('hidden');
    document.getElementById('player-list-view').classList.remove('hidden');
    document.getElementById('setup').classList.add('hidden');

    gameSocket = io.connect(`/${gameId}`);

    gameSocket.on('game-over', data => {
        alert(data.message);
        window.location.reload();
    });

    gameSocket.on('buzz', data => {
        if (data.playerName === playerName) {
            buzzSuccess();
        } else {
            freezeMyBuzzer();
        }
    });

    gameSocket.on('freeze-players', (data) => {
        if (data.players.includes(playerName)) {
            freezeMyBuzzer();
        } else {
            unfreezeMyBuzzer();
        }
    });

    gameSocket.on('reset-all', () => {
        unfreezeMyBuzzer();
    });

    gameSocket.on('players', updatePlayerList);
}

function buzz() {
    if (!document.getElementById('buzzer').hasAttribute('disabled')) {
        socket.emit('buzz');
    }
}

function buzzSuccess() {
    document.getElementById('buzzer').classList.add('success');
    document.getElementById('buzzer').setAttribute('disabled', 'disabled');
    document.getElementById('buzz-sound').play();
}

function freezeMyBuzzer() {
    document.getElementById('buzzer').setAttribute('disabled', 'disabled');
    document.getElementById('buzzer').classList.remove('success');
}

function unfreezeMyBuzzer() {
    document.getElementById('buzzer').removeAttribute('disabled');
    document.getElementById('buzzer').classList.remove('success');
}

// Admin functions

function createGame() {
    socket.emit('create-game');
}

function setupAdmin(gameId) {
    isInGame = true;

    document.getElementById('game-id-display').innerText = gameId;
    document.getElementById('game-id-p').classList.remove('hidden');
    document.getElementById('admin-view').classList.remove('hidden');
    document.getElementById('player-list-view').classList.remove('hidden');
    document.getElementById('setup').classList.add('hidden');

    gameSocket = io.connect(`/${gameId}`);

    gameSocket.on('players', updatePlayerList);
}

function freezeAll() {
    socket.emit('admin-freeze-all');
}

function resetAll() {
    socket.emit('admin-reset-all');
}

function freezePlayer() {
    socket.emit('admin-freeze-player');
}

socket.on('game-created', data => {
    setupAdmin(data.gameId);
});

socket.on('disconnect', () => {
    if (isInGame) {
        alert('You were disconnected');
        window.location.reload();
    }
});
