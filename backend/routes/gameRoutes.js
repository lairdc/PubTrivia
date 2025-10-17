// routes/gameRoutes.js
import express from 'express';
import Player from '../Player.js';

const router = express.Router();


router.post('/join', (req, res) => {
  const { id, name } = req.body;
  const player = new Player(id, name);
  req.room.addPlayer(player);
  res.json({ message: `Player ${name} joined the game.`, players: req.room.players });
});


router.post('/submit', (req, res) => {
  const { playerId, roundIndex, answers } = req.body;
  const player = req.room.getPlayer(playerId);

  if (!player) return res.status(404).json({ error: 'Player not found.' });
  if (!req.room.rounds[roundIndex]) return res.status(400).json({ error: 'Invalid round.' });

  player.answers[roundIndex] = answers;
  res.json({ message: `Answers submitted for ${player.name}`, answers });
});


router.get('/scoreboard', (req, res) => {
  const scoreboard = req.room.players.map(p => ({
    id: p.id,
    name: p.name,
    score: p.score
  }));
  res.json(scoreboard);
});


router.post('/nextRound', (req, res) => {
  const success = req.room.startNextRound();
  if (!success) return res.status(400).json({ error: 'No more rounds left.' });
  res.json({ message: `Moved to round ${req.room.currentRoundIndex + 1}` });
});

export default router;
