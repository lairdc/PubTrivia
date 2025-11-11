// routes/gameRoutes.js
import express from 'express';
import Player from '../Player.js';
import GameRoom from '../Gameroom.js';

const router = express.Router();

// --- Global map of all lobbies ---
const lobbies = {}; // key: lobbyCode, value: GameRoom instance

// --- CREATE LOBBY ---
router.post('/create', (req, res) => {
  const { hostId, hostName } = req.body;

  if (!hostId || !hostName) {
    return res.status(400).json({ error: 'Missing host ID or name.' });
  }

  // Generate a unique 4-letter lobby code
  let lobbyCode;
  do {
    lobbyCode = Math.random().toString(36).substring(2, 6).toUpperCase();
  } while (lobbies[lobbyCode]);

  // Create new GameRoom with host as first player
  const newRoom = new GameRoom(lobbyCode, { id: hostId, name: hostName });
  lobbies[lobbyCode] = newRoom;

  res.status(200).json({ message: 'Lobby created.', lobbyCode });
});

// --- JOIN LOBBY ---
router.post('/join', (req, res) => {
  const { code, id, name } = req.body;

  if (!code || !id || !name) {
    return res.status(400).json({ error: 'Missing lobby code, player id, or name.' });
  }

  const room = lobbies[code];
  if (!room) return res.status(404).json({ error: 'Lobby not found.' });

  const success = room.addPlayer({ id, name });
  if (!success) {
    return res.status(400).json({ error: 'Player with this ID or name already exists.' });
  }

  res.status(200).json({ message: 'Player joined successfully.', players: room.players });
});

// --- SUBMIT ANSWERS ---
router.post('/submit', (req, res) => {
  const { code, playerId, roundIndex, answers } = req.body;

  if (!code || !playerId || roundIndex == null || !answers) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const room = lobbies[code];
  if (!room) return res.status(404).json({ error: 'Lobby not found.' });

  const player = room.getPlayer(playerId);
  if (!player) return res.status(404).json({ error: 'Player not found.' });
  if (!room.rounds[roundIndex]) return res.status(400).json({ error: 'Invalid round.' });

  player.answers[roundIndex] = answers;
  res.json({ message: `Answers submitted for ${player.name}`, answers });
});

// --- SCOREBOARD ---
router.get('/scoreboard', (req, res) => {
  const code = req.query.code;
  const room = lobbies[code];

  if (!room) return res.status(404).json({ error: 'Lobby not found.' });

  const scoreboard = room.players.map(p => ({
    id: p.id,
    name: p.name,
    score: p.score ?? 0
  }));

  res.json(scoreboard);
});

// --- NEXT ROUND ---
router.post('/nextRound', (req, res) => {
  const { code } = req.body;
  const room = lobbies[code];

  if (!room) return res.status(404).json({ error: 'Lobby not found.' });

  const success = room.startNextRound();
  if (!success) return res.status(400).json({ error: 'No more rounds left.' });

  res.json({ message: `Moved to round ${room.currentRoundIndex + 1}` });
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

router.get('/status', (req, res) => {
  const code = req.query.code;
  const room = lobbies[code];
  if (!room) return res.status(404).json({ error: 'Lobby not found.' });
  res.json({ started: room.started });
});


export default router;
