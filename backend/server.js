// server.js
import express from 'express';
import bodyParser from 'body-parser';
import { loadQuestionsFromCSV } from './csvParser.js';
import GameRoom from './Gameroom.js';
import gameRoutes from './routes/gameRoutes.js';
import gradingRoutes from './routes/gradingRoutes.js';
import path from 'path';
import { fileURLToPath } from 'url';



const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());

app.use(express.static("public"));

// Needed because ES modules don’t have __dirname by default
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve the frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));




// start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

app.get('/', (req, res) => {
  res.send('PubTrivia server is running!');
});

app.use('/api/game', gameRoutes);
app.use('/api/grade', gradingRoutes);


/* ---COMMANDS TO TEST SERVER---:
DO THIS IN THE COMMAND PROMPT NOT TERMINAL
get to directory: cd .\Dropbox\ComputerScience\RCOS\PubTrivia\backend\

starting server: node server.js
(new cmd)player 1 join: curl -X POST http://localhost:3000/api/game/join -H "Content-Type: application/json" -d "{\"id\":\"p1\",\"name\":\"Peter\"}"
(new cmd) player 2 join: curl -X POST http://localhost:3000/api/game/join -H "Content-Type: application/json" -d "{\"id\":\"p2\",\"name\":\"Bob\"}"
(in p1 cmd)submit p1 answers: curl -X POST http://localhost:3000/api/game/submit -H "Content-Type: application/json" -d "{\"playerId\":\"p1\",\"roundIndex\":0,\"answers\":[\"George Washington\",\"John Wilkes Booth\"]}"
(in p2 cmd)submit p2 answers: curl -X POST http://localhost:3000/api/game/submit -H "Content-Type: application/json" -d "{\"playerId\":\"p2\",\"roundIndex\":0,\"answers\":[\"Abraham Lincoln\",\"John Wilkes Booth\"]}"
(new cmd) fetch answers: curl http://localhost:3000/api/grade/round/0
(in ^^ cmd) grade p1: curl -X POST http://localhost:3000/api/grade/grade -H "Content-Type: application/json" -d "{\"playerId\":\"p1\",\"roundIndex\":0,\"results\":[true,false]}"
(in ^^ cmd) grade p2: curl -X POST http://localhost:3000/api/grade/grade -H "Content-Type: application/json" -d "{\"playerId\":\"p2\",\"roundIndex\":0,\"results\":[false,true]}"
(in ^^ cmd) view scoreboard: curl http://localhost:3000/api/game/scoreboard
*/
