// routes/gameRoutes.js
import express from 'express';
import crypto from 'crypto';
import multer from 'multer';

import Player from '../Player.js';
import GameRoom from '../Gameroom.js';
import { loadQuestionsFromCSVString } from '../csvParser.js';

const router = express.Router();

// In-memory storage for Multer (for CSV upload)
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

// ---------------- LOBBY / BASIC ROUTES ----------------

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
    isHost: false,
    score: 0,
    answers: {}
  });

  res.json({
    success: true,
    playerId
  });
});

// --- SCOREBOARD + GAME STATE ---
router.get('/scoreboard', (req, res) => {
  const code = req.query.code;
  const room = lobbies[code];

  if (!room) return res.status(404).json({ error: 'Lobby not found.' });

  const playersSorted = [...room.players].sort(
    (a, b) => (b.score ?? 0) - (a.score ?? 0)
  );

  const roundIndex = room.currentRoundIndex;
  const { submittedCount, totalPlayers } = room.submissionCounts(roundIndex);

  res.json({
    host: room.host ? {
      id: room.host.id,
      name: room.host.name
    } : null,
    players: playersSorted.map(p => ({
      id: p.id,
      name: p.name,
      score: p.score ?? 0
    })),
    hasQuestions: Array.isArray(room.rounds) && room.rounds.length > 0,
    phase: room.phase,
    currentRoundIndex: room.currentRoundIndex,
    totalRounds: room.rounds.length,
    submittedCount,
    totalPlayers,
    allSubmitted: room.allPlayersSubmitted(roundIndex)
  });
});

// --- GAME STATUS (used by lobby to redirect to submit page) ---
router.get('/status', (req, res) => {
  const code = req.query.code;
  const room = lobbies[code];
  if (!room) return res.status(404).json({ error: 'Lobby not found.' });
  res.json({ started: room.started, phase: room.phase, currentRoundIndex: room.currentRoundIndex });
});

// --- START GAME (host only) ---
router.post('/start', (req, res) => {
  const { code, playerId } = req.body;
  const room = lobbies[code];
  if (!room) return res.status(404).json({ error: 'Lobby not found.' });

  if (room.host.id !== playerId) {
    return res.status(403).json({ error: 'Only the host can start the game.' });
  }

  if (!room.rounds || room.rounds.length === 0) {
    return res.status(400).json({ error: 'You must upload a trivia CSV before starting the game.' });
  }

  if (!room.players || room.players.length === 0) {
    return res.status(400).json({ error: 'At least one player must join before starting the game.' });
  }

  room.startGame();
  res.json({ message: 'Game started!', hostId: room.host.id });
});

// ---------------- CSV UPLOAD / REMOVE ----------------

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
    room.phase = 'lobby';
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
  room.phase = 'lobby';

  res.json({ message: 'Questions removed. You can upload a new CSV.' });
});

// ---------------- ROUND INFO / ANSWERING ----------------

/**
 * GET /api/game/roundInfo?code=ABC&playerId=...
 * Returns info about the current round, including questions (no answers),
 * and whether this player has already submitted.
 */
router.get('/roundInfo', (req, res) => {
  const { code, playerId } = req.query;
  const room = lobbies[code];

  if (!room) {
    return res.status(404).json({ error: 'Lobby not found.' });
  }

  const round = room.getCurrentRound();
  if (!round) {
    return res.status(400).json({ error: 'No current round.' });
  }

  const isHost = room.host && room.host.id === playerId;
  let player = null;

  if (!isHost) {
    player = room.getPlayer(playerId);
    if (!player) {
      return res.status(400).json({ error: 'Invalid playerId' });
    }
  }

  // Build question list without answers
  const questions = round.questions.map((q, idx) => ({
    index: idx,
    text: q.text,
    points: q.points
  }));

  // Only players have submissions, host always hasSubmitted = false
  const hasSubmitted = !isHost 
    ? room.hasPlayerSubmitted(room.currentRoundIndex, playerId)
    : false;

  const { submittedCount, totalPlayers } = room.submissionCounts(room.currentRoundIndex);

  res.json({
    roundIndex: room.currentRoundIndex,
    roundTitle: round.title,
    questions,
    phase: room.phase,
    isHost,     // <-- now submit.html knows FOR SURE
    hasSubmitted,
    submittedCount,
    totalPlayers,
    allSubmitted: room.allPlayersSubmitted(room.currentRoundIndex)
  });
});

/**
 * POST /api/game/submitAnswers
 * { code, playerId, roundIndex, answers: [string, ...] }
 */
router.post('/submitAnswers', (req, res) => {
  const { code, playerId, roundIndex, answers } = req.body;
  const room = lobbies[code];
  if (!room) return res.status(404).json({ error: 'Lobby not found.' });

  if (!room.started || room.phase !== 'answering') {
    return res.status(400).json({ error: 'Not currently collecting answers.' });
  }

  if (roundIndex !== room.currentRoundIndex) {
    return res.status(400).json({ error: 'Wrong round index.' });
  }

  try {
    room.recordAnswers(playerId, roundIndex, answers);
    res.json({ message: 'Answers submitted.' });
  } catch (err) {
    console.error('submitAnswers error:', err);
    res.status(400).json({ error: err.message || 'Invalid answers.' });
  }
});

// ---------------- GRADING ----------------

/**
 * POST /api/game/startGrading
 * { code, playerId }
 * Host triggers grading; any players who have not submitted simply
 * get zero for this round.
 */
router.post('/startGrading', (req, res) => {
  const { code, playerId } = req.body;
  const room = lobbies[code];
  if (!room) return res.status(404).json({ error: 'Lobby not found.' });

  if (room.host.id !== playerId) {
    return res.status(403).json({ error: 'Only the host can start grading.' });
  }

  if (room.phase !== 'answering') {
    return res.status(400).json({ error: 'Not in answer-collection phase.' });
  }

  try {
    room.initGradingForCurrentRound();
    const { submittedCount, totalPlayers } = room.submissionCounts(room.currentRoundIndex);
    const gradingItems = room.gradingQueue.length;

    res.json({
      message: 'Grading started.',
      submittedCount,
      totalPlayers,
      gradingItems
    });
  } catch (err) {
    console.error('startGrading error:', err);
    res.status(400).json({ error: err.message || 'Failed to start grading.' });
  }
});

/**
 * GET /api/game/nextGradeItem?code=...&playerId=...
 * Host pulls the next item to grade.
 */
router.get('/nextGradeItem', (req, res) => {
  const { code, playerId } = req.query;
  const room = lobbies[code];
  if (!room) return res.status(404).json({ error: 'Lobby not found.' });

  if (room.host.id !== playerId) {
    return res.status(403).json({ error: 'Only the host can grade answers.' });
  }

  if (room.phase !== 'grading') {
    // if we've finished grading, we might be in 'betweenRounds'
    if (room.phase === 'betweenRounds') {
      return res.json({ done: true });
    }
    return res.status(400).json({ error: 'Not in grading phase.' });
  }

  const item = room.getNextGradeItem();
  if (!item) {
    // grading finished
    return res.json({ done: true });
  }

  res.json({
    done: false,
    item
  });
});

/**
 * POST /api/game/submitGrade
 * { code, playerId, targetPlayerId, roundIndex, questionIndex, correct }
 */
router.post('/submitGrade', (req, res) => {
  const { code, playerId, targetPlayerId, roundIndex, questionIndex, correct } = req.body;
  const room = lobbies[code];
  if (!room) return res.status(404).json({ error: 'Lobby not found.' });

  if (room.host.id !== playerId) {
    return res.status(403).json({ error: 'Only the host can grade answers.' });
  }

  if (room.phase !== 'grading') {
    return res.status(400).json({ error: 'Not in grading phase.' });
  }

  try {
    room.applyGrade(roundIndex, questionIndex, targetPlayerId, !!correct);
    res.json({ message: 'Grade recorded.' });
  } catch (err) {
    console.error('submitGrade error:', err);
    res.status(400).json({ error: err.message || 'Failed to record grade.' });
  }
});

// ---------------- NEXT ROUND ----------------

/**
 * POST /api/game/nextRound
 * { code, playerId }
 */
router.post('/nextRound', (req, res) => {
  const { code, playerId } = req.body;
  const room = lobbies[code];
  if (!room) return res.status(404).json({ error: 'Lobby not found.' });

  if (room.host.id !== playerId) {
    return res.status(403).json({ error: 'Only the host can move to the next round.' });
  }

  if (room.phase !== 'betweenRounds') {
    return res.status(400).json({ error: 'Cannot move to next round yet. Finish grading first.' });
  }

  const success = room.startNextRound();
  if (!success) {
    // no more rounds
    room.phase = 'finished';
    return res.json({ message: 'No more rounds. Game finished.', finished: true });
  }

  res.json({
    message: `Moved to round ${room.currentRoundIndex + 1}`,
    currentRoundIndex: room.currentRoundIndex
  });
});

export default router;
