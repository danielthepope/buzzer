const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const fs = require('fs');

server.listen(8080);
console.log('App is probably listening on 8080');

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/client/index.html');
});

app.use(express.static('client'));

class Game {
    gameId; // e.g. '1234'
    players = [];
    broadcast; // Socket thing
    frozenPlayers = [];
    buzzedPlayer = null;

    constructor(gameId) {
        this.gameId = gameId;
        this.broadcast = io.of('/' + gameId);
    }
}

class SessionData {
    gameId; // e.g. '123456'
    playerName; // e.g. 'dan'
    isAdmin = false;
}

const GAMES = {};

io.on('connection', (socket) => {
    let sessionData = null;

    function log(message) {
        if (sessionData?.gameId) {
            console.log(`[${sessionData.gameId}] ${message}`);
        } else {
            console.log(message);
        }
    }

    log('New connection');

    socket.on('join-request', (data, callback) => {
        if (data.gameId in GAMES) {
            sessionData = new SessionData();
            sessionData.playerName = data.playerName;
            sessionData.gameId = data.gameId;
            if (GAMES[sessionData.gameId].players.includes(data.playerName)) {
                callback('Player name already in use');
            } else {
                GAMES[data.gameId].players.push(data.playerName);
                log(`${data.playerName} has joined`);
                callback(null, {
                    playerName: sessionData.playerName,
                    gameId: sessionData.gameId,
                    players: updatePlayerList()
                });
            }
        } else {
            callback('Invalid Game ID');
        }
    });

    socket.on('buzz', () => {
        if (sessionData?.gameId && sessionData?.playerName) {
            if (GAMES[sessionData.gameId].buzzedPlayer === null) {
                GAMES[sessionData.gameId].buzzedPlayer = sessionData.playerName;
                GAMES[sessionData.gameId].broadcast.emit('buzz', { playerName: sessionData.playerName });
                updatePlayerList();
                log(`${sessionData.playerName} has buzzed`);
            }
        }
    });

    socket.on('create-game', () => {
        const gameId = generateGameId();
        const game = new Game(gameId);
        GAMES[gameId] = game;
        sessionData = new SessionData();
        sessionData.isAdmin = true;
        sessionData.name = 'Admin';
        sessionData.gameId = gameId;

        log('Game created');

        socket.emit('game-created', { gameId: gameId });
    });

    socket.on('admin-freeze-all', () => {
        if (sessionData.isAdmin) {
            GAMES[sessionData.gameId].frozenPlayers = Array.from(GAMES[sessionData.gameId].players);
            GAMES[sessionData.gameId].broadcast.emit('freeze-players', { players: GAMES[sessionData.gameId].frozenPlayers });
            updatePlayerList();
            log('Disabled all buzzers');
        }
    });

    socket.on('admin-freeze-player', () => {
        if (sessionData.isAdmin) {
            GAMES[sessionData.gameId].frozenPlayers.push(GAMES[sessionData.gameId].buzzedPlayer);
            GAMES[sessionData.gameId].buzzedPlayer = null;
            GAMES[sessionData.gameId].broadcast.emit('freeze-players', { players: GAMES[sessionData.gameId].frozenPlayers });
            updatePlayerList();
            log(`FROZEN: ${GAMES[sessionData.gameId].frozenPlayers}`);
        }
    });

    socket.on('admin-reset-all', () => {
        if (sessionData.isAdmin) {
            GAMES[sessionData.gameId].frozenPlayers = [];
            GAMES[sessionData.gameId].buzzedPlayer = null;
            GAMES[sessionData.gameId].broadcast.emit('reset-all');
            updatePlayerList();
            log('RESET');
        }
    });

    socket.on('disconnect', () => {
        log(`${sessionData?.playerName} has left`);
        if (sessionData?.playerName && sessionData?.gameId) {
            if (sessionData.gameId in GAMES && GAMES[sessionData.gameId].players.includes(sessionData.playerName)) {
                const index = GAMES[sessionData.gameId].players.indexOf(sessionData.playerName);
                GAMES[sessionData.gameId].players.splice(index, 1);
                updatePlayerList();
            }
        }
        if (sessionData?.isAdmin) {
            GAMES[sessionData.gameId].broadcast.emit('game-over', { message: 'Admin has left' });
            log('Deleted game');
            delete GAMES[sessionData.gameId];
        }
    });

    function updatePlayerList() {
        const data = GAMES[sessionData.gameId].players.map(playerName => {
            return {
                playerName: playerName,
                isFrozen: GAMES[sessionData.gameId].frozenPlayers.includes(playerName),
                isBuzzed: GAMES[sessionData.gameId].buzzedPlayer === playerName
            };
        });
        // Sort by Buzzed at top, then those not frozen, then frozen, alphabetically
        data.sort((a, b) => {
            if (a.isBuzzed) return -1;
            if (b.isBuzzed) return 1;
            if (a.isFrozen && !b.isFrozen) return 1;
            if (!a.isFrozen && b.isFrozen) return -1;
            if (a.playerName < b.playerName) return -1;
            if (a.playerName > b.playerName) return 1;
            return 0;
        });

        GAMES[sessionData.gameId].broadcast.emit('players', data);
        return data;
    }
});

function generateGameId() {
    const randomNumber = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    if (randomNumber in GAMES) {
        console.log('Randomly generated game ID already exists. Try again');
        return generateGameId();
    } else {
        return randomNumber;
    }
}