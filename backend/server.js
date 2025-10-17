// server.js
import express from 'express';
import bodyParser from 'body-parser';
import { loadQuestionsFromCSV } from './csvParser.js';
import GameRoom from './Gameroom.js';
import gameRoutes from './routes/gameRoutes.js';

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());

// Initialize in-memory game room (you can make this dynamic later)
const room = new GameRoom('ABCD', { id: 'host1', name: 'Host' });
room.rounds = await loadQuestionsFromCSV('./questions.csv');

// Attach room to req for route access
app.use((req, res, next) => {
  req.room = room;
  next();
});

// Mount routes
app.use('/api/game', gameRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
