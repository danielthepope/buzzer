const socket = io();
let gameId = null;
let playerName = null;

const storedGameId = window.sessionStorage.getItem('gameId');
const storedName = window.localStorage.getItem('name');

document.getElementById('gameid-input').value = storedGameId;
document.getElementById('name-input').value = storedName;

function saveAutofill(gameId, name) {
    window.sessionStorage.setItem('gameId', gameId);
    window.localStorage.setItem('name', name);
}

const buzzer = document.getElementById('buzzer');
const buzzerHammer = new Hammer.Manager(buzzer);
buzzerHammer.add(new Hammer.Press({ time: 10 }));
buzzerHammer.on('press', e => {
    buzzer.classList.add('pressed');
    buzz();
});
buzzerHammer.on('pressup', e => {
    buzzer.classList.remove('pressed');
    buzzUp();
});

const buzzerSound = new Howl({
    src: '/audio/success.mp3'
});

let isInGame = false;

function confirmExit() {
    if (isInGame && !confirm('Are you sure you want to quit?')) {
        return;
    }
    window.location.reload();
}

function updatePlayers(players) {
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

    // Is my buzzer enabled?
    const me = players.find(p => p.playerName === playerName);
    const someoneBuzzed = players.some(p => p.isBuzzed);
    if (me && !me.isBuzzed) {
        if (me.isFrozen || someoneBuzzed) {
            freezeMyBuzzer();
        } else {
            unfreezeMyBuzzer();
        }
    }
}

function updateAdminButtons(players) {
    const buzzedPlayer = players.find(p => p.isBuzzed);
    const freezePlayerButton = document.getElementById('freeze-player-button');
    if (buzzedPlayer) {
        updateAdminMessage(`${buzzedPlayer.playerName} has buzzed`);
        freezePlayerButton.innerText = `Freeze ${buzzedPlayer.playerName}`;
        freezePlayerButton.removeAttribute('disabled');
    } else {
        updateAdminMessage(null);
        freezePlayerButton.innerText = 'Freeze player';
        freezePlayerButton.setAttribute('disabled', 'disabled');
    }
}

function updateAdminMessage(message) {
    const adminMessage = document.getElementById('admin-message');
    if (message) {
        adminMessage.innerText = message;
    } else {
        adminMessage.innerHTML = '&nbsp;';
    }
    navigator.vibrate(50);
}

// Client functions

function join() {
    playerName = document.getElementById("name-input").value;
    gameId = document.getElementById("gameid-input").value;
    socket.emit('join-request', { playerName, gameId }, (err, data) => {
        if (err) {
            alert(err);
        } else {
            setupPlayer(gameId);
            updatePlayers(data.players);
            saveAutofill(gameId, playerName);
        }
    });
}

function setupPlayer(gameId) {
    isInGame = true;

    document.getElementById('game-id-display').innerText = gameId;
    document.getElementById('game-id-p').classList.remove('hidden');
    document.getElementById('player-name-display').innerText = playerName;
    document.getElementById('player-view').classList.remove('hidden');
    document.getElementById('player-list-view').classList.remove('hidden');
    document.getElementById('setup').classList.add('hidden');
    document.getElementById('buzzer-header').scrollIntoView();

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

    gameSocket.on('players', updatePlayers);

    navigator.vibrate(50);
}

function buzz() {
    if (!document.getElementById('buzzer').classList.contains('disabled')) {
        socket.emit('buzz');
        navigator.vibrate(30);
    }
}

function buzzUp() {
    if (!document.getElementById('buzzer').classList.contains('disabled')) {
        navigator.vibrate(30);
    }
}

function buzzSuccess() {
    document.getElementById('buzzer').classList.add('success');
    document.getElementById('buzzer').classList.add('disabled');
    document.getElementById('buzzer').classList.remove('ready');
    buzzerSound.play();
    navigator.vibrate(300);
}

function freezeMyBuzzer() {
    document.getElementById('buzzer').classList.add('disabled');
    document.getElementById('buzzer').classList.remove('success');
    document.getElementById('buzzer').classList.remove('ready');
}

function unfreezeMyBuzzer() {
    const buzzer = document.getElementById('buzzer');
    if (buzzer.classList.contains('disabled')) {
        navigator.vibrate(50);
    }
    buzzer.classList.remove('disabled');
    document.getElementById('buzzer').classList.remove('success');
    document.getElementById('buzzer').classList.add('ready');
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

    gameSocket.on('players', (players) => {
        updatePlayers(players);
        updateAdminButtons(players);
    });

    gameSocket.on('admin-message', data => {
        updateAdminMessage(data.message);
    });

    navigator.vibrate(50);
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

socket.on('measure-ping', callback => {
    callback();
});

socket.on('game-created', data => {
    setupAdmin(data.gameId);
});

socket.on('disconnect', () => {
    if (isInGame) {
        alert('You were disconnected');
        window.location.reload();
    }
});
