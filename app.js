const app = require('http').createServer(handler)
const io = require('socket.io')(app);
const fs = require('fs');

app.listen(8080);
console.log('App is probably listening on 8080');

function handler(req, res) {
    fs.readFile(__dirname + '/client/index.html',
        (err, data) => {
            if (err) {
                res.writeHead(500);
                return res.end('Error loading index.html');
            }

            res.writeHead(200);
            res.end(data);
        });
}

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
                callback(null, sessionData);
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
            GAMES[sessionData.gameId].broadcast.emit('freeze-players', { players: GAMES[sessionData.gameId].players });
        }
    });

    socket.on('admin-freeze-player', () => {
        if (sessionData.isAdmin) {
            GAMES[sessionData.gameId].frozenPlayers.push(GAMES[sessionData.gameId].buzzedPlayer);
            GAMES[sessionData.gameId].buzzedPlayer = null;
            GAMES[sessionData.gameId].broadcast.emit('freeze-players', { players: GAMES[sessionData.gameId].frozenPlayers });
            log(`FROZEN: ${GAMES[sessionData.gameId].frozenPlayers}`);
        }
    });

    socket.on('admin-reset-all', () => {
        if (sessionData.isAdmin) {
            GAMES[sessionData.gameId].frozenPlayers = [];
            GAMES[sessionData.gameId].buzzedPlayer = null;
            GAMES[sessionData.gameId].broadcast.emit('reset-all');
            log('RESET');
        }
    });

    socket.on('disconnect', () => {
        log(`${sessionData?.playerName} has left`);
        if (sessionData?.playerName && sessionData?.gameId) {
            if (sessionData.gameId in GAMES && GAMES[sessionData.gameId].players.includes(sessionData.playerName)) {
                const index = GAMES[sessionData.gameId].players.indexOf(sessionData.playerName);
                GAMES[sessionData.gameId].players.splice(index, 1);
            }
        }
        if (sessionData?.isAdmin) {
            GAMES[sessionData.gameId].broadcast.emit('alert', { message: 'Admin has left' });
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