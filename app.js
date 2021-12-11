const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const fs = require('fs');

const MESSAGE_LOCATION = 'message/message.txt';
const PORT = 8080;

server.listen(PORT);
console.log('App is probably listening on 8080');

let broadcastMessage = null;

function updateBroadcastMessage() {
    fs.exists(MESSAGE_LOCATION, exists => {
        if (exists) {
            fs.readFile(MESSAGE_LOCATION, 'utf-8', (err, text) => {
                if (err) {
                    console.log('Cannot load broadcast message:', err);
                } else {
                    broadcastMessage = text;
                }
            });
        } else {
            broadcastMessage = null;
        }
    });
}
updateBroadcastMessage();
setInterval(updateBroadcastMessage, 30000);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/client/index.html');
});

app.use(express.static('client'));

class Game {
    gameId; // e.g. '1234'
    sessions = [];
    broadcast; // Socket thing
    frozenPlayers = [];
    allFrozen = false;
    buzzedPlayer = null;
    buzzes = [];
    t0 = 0;

    constructor(gameId) {
        this.gameId = gameId;
        this.broadcast = io.of('/' + gameId);
    }

    log(message) {
        console.log(`[${this.gameId}] ${message}`);
    }

    get players() {
        return this.sessions.map(s => s.playerName);
    }

    deletePlayer(playerName) {
        const index = this.players.indexOf(playerName);
        if (index > -1) {
            this.sessions.splice(index, 1);
        }
    }

    get maximumLatency() {
        return Math.max(...this.sessions.map(s => s.latency));
    }

    updatePlayerList() {
        const data = this.players.map(playerName => {
            return {
                playerName: playerName,
                isFrozen: this.frozenPlayers.includes(playerName),
                isBuzzed: this.buzzedPlayer === playerName
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

        this.broadcast.emit('players', data);
        return data;
    }

    buzz(playerName, latency) {
        const receivedTime = Date.now();
        const buzzTime = receivedTime - latency;
        if (this.buzzes.length === 0) {
            this.t0 = receivedTime;
            setTimeout(() => {
                const firstBuzz = this.buzzes.sort((a, b) => a.buzzTime - b.buzzTime)[0];
                this.buzzedPlayer = firstBuzz.playerName;
                this.log(`${this.buzzedPlayer} buzzed first`);
                this.broadcast.emit('buzz', { playerName: this.buzzedPlayer });
                this.updatePlayerList();
            }, this.maximumLatency);
        }
        this.buzzes.push({ playerName, buzzTime });
        this.log(`${Math.floor(buzzTime - this.t0).toString().padStart(5, ' ')}: buzz from ${playerName}`);
    }

}

class SessionData {
    gameId; // e.g. '123456'
    playerName; // e.g. 'dan'
    isAdmin = false;
    #latency = [];

    get latency() {
        if (this.#latency) {
            return this.#latency.reduce((a, b) => a + b, 0) / this.#latency.length;
        } else {
            return 0;
        }
    }

    addLatency(value) {
        this.#latency.push(value);
        this.#latency = this.#latency.splice(-3);
    }
}

const GAMES = {};

io.on('connection', (socket) => {
    let sessionData = null;
    let latencyChecker = null;
    let messageSender = null;
    let sentMessage = null;

    function log(message) {
        if (sessionData?.gameId) {
            console.log(`[${sessionData.gameId}] ${message}`);
        } else {
            console.log(message);
        }
    }

    function measureLatency() {
        const ping = Date.now();
        socket.emit('measure-ping', () => {
            let latency = (Date.now() - ping) / 2; // Divide by 2 because I only want the latency of one direction
            socket.emit('latency-update', { ping: latency });
            if (latency > 500) {
                log(`${sessionData.playerName} latency: ${latency}ms (too high!)`);
                latency = 500;
            }
            sessionData.addLatency(latency);
            log(`${sessionData.playerName} latency: ${latency}ms (average ${sessionData.latency}ms)`);
        });
    }

    function sendMessage() {
        if (sentMessage !== broadcastMessage) {
            socket.emit('message', {
                message: broadcastMessage
            });
            sentMessage = broadcastMessage;
        }
    }
    sendMessage();
    messageSender = setInterval(sendMessage, 30000);

    log('New connection');

    socket.on('join-request', (data, callback) => {
        if (data.gameId.length !== 4 || !parseInt(data.gameId)) {
            callback('Invalid game ID');
        }
        else if (data.playerName.length > 30) {
            callback('Nickname too long');
        }
        else if (!data.playerName) {
            callback('Please provide a nickname');
        }
        else if (data.gameId in GAMES) {
            sessionData = new SessionData();
            sessionData.playerName = data.playerName;
            sessionData.gameId = data.gameId;
            if (GAMES[sessionData.gameId].players.includes(data.playerName)) {
                callback('Player name already in use');
            } else {
                GAMES[data.gameId].sessions.push(sessionData);
                log(`${data.playerName} has joined`);
                if (GAMES[sessionData.gameId].allFrozen) {
                    GAMES[sessionData.gameId].frozenPlayers.push(sessionData.playerName);
                }
                callback(null, {
                    playerName: sessionData.playerName,
                    gameId: sessionData.gameId,
                    players: GAMES[data.gameId].updatePlayerList()
                });
                measureLatency();
                latencyChecker = setInterval(measureLatency, 10000);
                GAMES[data.gameId].broadcast.emit('admin-message', { message: `${data.playerName} has joined` });
            }
        } else {
            callback("Game ID doesn't exist");
        }
    });

    socket.on('buzz', () => {
        if (sessionData?.gameId && sessionData?.playerName) {
            GAMES[sessionData.gameId].buzz(sessionData.playerName, sessionData.latency);
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
            GAMES[sessionData.gameId].allFrozen = true;
            GAMES[sessionData.gameId].buzzedPlayer = null;
            GAMES[sessionData.gameId].buzzes = [];
            GAMES[sessionData.gameId].updatePlayerList();
            log('Disabled all buzzers');
        }
    });

    socket.on('admin-freeze-player', () => {
        if (sessionData.isAdmin) {
            GAMES[sessionData.gameId].frozenPlayers.push(GAMES[sessionData.gameId].buzzedPlayer);
            GAMES[sessionData.gameId].buzzedPlayer = null;
            GAMES[sessionData.gameId].buzzes = [];
            GAMES[sessionData.gameId].updatePlayerList();
            log(`FROZEN: ${GAMES[sessionData.gameId].frozenPlayers}`);
        }
    });

    socket.on('admin-reset-all', () => {
        if (sessionData.isAdmin) {
            GAMES[sessionData.gameId].frozenPlayers = [];
            GAMES[sessionData.gameId].allFrozen = false;
            GAMES[sessionData.gameId].buzzedPlayer = null;
            GAMES[sessionData.gameId].buzzes = [];
            GAMES[sessionData.gameId].updatePlayerList();
            log('RESET');
        }
    });

    socket.on('disconnect', () => {
        log(`${sessionData?.playerName || (sessionData?.isAdmin ? 'admin' : 'non-player')} has left`);
        clearInterval(latencyChecker);
        clearInterval(messageSender);
        if (sessionData?.playerName && sessionData?.gameId) {
            if (sessionData.gameId in GAMES) {
                GAMES[sessionData.gameId]?.deletePlayer(sessionData.playerName);
                GAMES[sessionData.gameId]?.updatePlayerList();
                GAMES[sessionData.gameId]?.broadcast.emit('admin-message', { message: `${sessionData.playerName} has left` });
            }
        }
        if (sessionData?.isAdmin) {
            GAMES[sessionData.gameId].broadcast.emit('game-over', { message: 'Admin has left' });
            log('Deleted game');
            delete GAMES[sessionData.gameId];
        }
    });
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