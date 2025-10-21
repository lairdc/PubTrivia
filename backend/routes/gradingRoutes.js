// routes/gradingRoutes.js
import express from 'express';

const router = express.Router();

/**
 * Get all answers for a round (so host can see what players submitted)
 */
router.get('/round/:roundIndex', (req, res) => {
  const roundIndex = parseInt(req.params.roundIndex, 10);
  const round = req.room.rounds[roundIndex];

  if (!round) return res.status(400).json({ error: 'Invalid round index.' });

  // Build summary of what each player answered
  const submissions = req.room.players.map(player => ({
    id: player.id,
    name: player.name,
    answers: player.answers?.[roundIndex] ?? [],
  }));

  res.json({
    round: round.name,
    questions: round.questions.map(q => q.text),
    submissions,
  });
});

/**
 * Grade a player's answers manually.
 * The host sends a list of booleans (true/false) for each question.
 */
router.post('/grade', (req, res) => {
  const { playerId, roundIndex, results } = req.body;

  if (!playerId || roundIndex === undefined || !Array.isArray(results)) {
    return res.status(400).json({ error: 'Missing playerId, roundIndex, or results array.' });
  }

  const player = req.room.getPlayer(playerId);
  const round = req.room.rounds[roundIndex];

  if (!player) return res.status(404).json({ error: 'Player not found.' });
  if (!round) return res.status(400).json({ error: 'Invalid round index.' });

  let pointsAwarded = 0;

  round.questions.forEach((question, qIndex) => {
    if (results[qIndex]) {
      player.score += question.points;
      pointsAwarded += question.points;
    }
  });

  res.json({
    message: `Graded ${player.name} for round ${round.name}`,
    pointsAwarded,
    newScore: player.score,
  });
});

export default router;
