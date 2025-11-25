// server.js
import express from 'express';
import bodyParser from 'body-parser';
import gameRoutes from './routes/gameRoutes.js';
import gradingRoutes from './routes/gradingRoutes.js';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());

// Serve static assets (if any) from "public"
app.use(express.static("public"));

// Needed because ES modules don’t have __dirname by default
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve the frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// Simple health-check route
app.get('/', (req, res) => {
  res.send('PubTrivia server is running!');
});

// API routes
app.use('/api/game', gameRoutes);
app.use('/api/grade', gradingRoutes);


/* ---COMMANDS TO TEST SERVER---:
DO THIS IN THE COMMAND PROMPT NOT TERMINAL
get to directory: cd .\Dropbox\ComputerScience\RCOS\PubTrivia\backend\

starting server: node server.js

*/
