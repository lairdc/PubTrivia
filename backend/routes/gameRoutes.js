// routes/gameRoutes.js
import express from 'express';
import Player from '../Player.js';
import GameRoom from '../Gameroom.js';
import crypto from 'crypto';

const router = express.Router();

const lobbies = {}; // lobbyCode -> GameRoom instance

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// --- CREATE LOBBY ---
router.post('/create', (req, res) => {
  const hostName = req.body.hostName;
  if (!hostName) return res.status(400).json({ error: "Host name required" });

  const code = generateRoomCode();
  const hostId = crypto.randomUUID();

  const room = new GameRoom(code, hostId, hostName);
  lobbies[code] = room;

  res.json({
    lobbyCode: code,
    playerId: hostId,
    isHost: true
  });
});

// --- JOIN LOBBY ---
router.post('/join', (req, res) => {
  const { name, code } = req.body;
  const room = lobbies[code];

  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  const playerId = crypto.randomUUID();

  room.addPlayer({
    id: playerId,
    name: name,
    isHost: false
  });

  res.json({
    success: true,
    playerId
  });
});

// --- SCOREBOARD ---
router.get('/scoreboard', (req, res) => {
  const code = req.query.code;
  const room = lobbies[code];

  if (!room) return res.status(404).json({ error: 'Lobby not found.' });

  res.json({
    host: room.host,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      score: p.score ?? 0
    }))
  });
});

// --- START GAME (host only) ---
router.post('/start', (req, res) => {
  const { code, playerId } = req.body;
  const room = lobbies[code];
  if (!room) return res.status(404).json({ error: 'Lobby not found.' });

  if (room.host.id !== playerId) {
    return res.status(403).json({ error: 'Only the host can start the game.' });
  }

  room.startGame();
  res.json({ message: 'Game started!', hostId: room.host.id });
});

// --- GAME STATUS ---
router.get('/status', (req, res) => {
  const code = req.query.code;
  const room = lobbies[code];
  if (!room) return res.status(404).json({ error: 'Lobby not found.' });

  res.json({ started: room.started });
});

export default router;
