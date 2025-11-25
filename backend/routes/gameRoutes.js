// routes/gameRoutes.js
import express from 'express';
import crypto from 'crypto';
import multer from 'multer';

import Player from '../Player.js';
import GameRoom from '../Gameroom.js';
import { loadQuestionsFromCSVString } from '../csvParser.js';

const router = express.Router();

// In-memory storage for Multer (we read file into a buffer)
const upload = multer({ storage: multer.memoryStorage() });

// --- Global map of all lobbies ---
const lobbies = {}; // key: lobbyCode, value: GameRoom instance

function generateRoomCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

// --- CREATE LOBBY ---
router.post('/create', (req, res) => {
  const hostName = req.body.hostName;
  if (!hostName) {
    return res.status(400).json({ error: "Host name is required." });
  }

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
  if (!name) {
    return res.status(400).json({ error: "Name is required." });
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

// --- SUBMIT ANSWERS (unchanged for now) ---
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

// --- SCOREBOARD + hasQuestions flag ---
router.get('/scoreboard', (req, res) => {
  const code = req.query.code;
  const room = lobbies[code];

  if (!room) return res.status(404).json({ error: 'Lobby not found.' });

  res.json({
    host: room.host ? {
      id: room.host.id,
      name: room.host.name
    } : null,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      score: p.score ?? 0
    })),
    hasQuestions: Array.isArray(room.rounds) && room.rounds.length > 0
  });
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

  // Enforce that questions must be uploaded first
  if (!room.rounds || room.rounds.length === 0) {
    return res.status(400).json({ error: 'You must upload a trivia CSV before starting the game.' });
  }

  // Enforce that at least one player has joined
  if (!room.players || room.players.length === 0) {
    return res.status(400).json({ error: 'At least one player must join before starting the game.' });
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

// --- UPLOAD QUESTIONS (host-only, before game starts) ---
router.post('/uploadQuestions', upload.single('file'), async (req, res) => {
  const { code, playerId } = req.body;

  const room = lobbies[code];
  if (!room) return res.status(404).json({ error: 'Lobby not found.' });

  if (room.host.id !== playerId) {
    return res.status(403).json({ error: 'Only the host can upload questions.' });
  }

  if (room.started) {
    return res.status(400).json({ error: 'Cannot upload questions after the game has started.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const csvText = req.file.buffer.toString('utf-8');

  try {
    const rounds = await loadQuestionsFromCSVString(csvText);
    room.rounds = rounds;
    room.currentRoundIndex = 0;
    res.json({
      message: 'Questions uploaded successfully.',
      roundCount: rounds.length
    });
  } catch (err) {
    console.error('CSV parse error:', err);
    res.status(400).json({ error: err.message || 'Invalid CSV format.' });
  }
});

// --- REMOVE QUESTIONS (host-only) ---
router.delete('/removeQuestions', (req, res) => {
  const { code, playerId } = req.body;
  const room = lobbies[code];

  if (!room) return res.status(404).json({ error: 'Lobby not found.' });

  if (room.host.id !== playerId) {
    return res.status(403).json({ error: 'Only the host can remove questions.' });
  }

  if (room.started) {
    return res.status(400).json({ error: 'Cannot remove questions after the game has started.' });
  }

  room.rounds = [];
  room.currentRoundIndex = 0;

  res.json({ message: 'Questions removed. You can upload a new CSV.' });
});

export default router;
