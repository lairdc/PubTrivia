import GameRoom from './Gameroom.js';
import Player from './Player.js';
import { loadQuestionsFromCSV } from './csvParser.js';

async function simulateGame() {
  const room = new GameRoom('ABCD', { id: 'host1', name: 'Host' });
  room.rounds = await loadQuestionsFromCSV('./questions.csv');

  // Add players
  const p1 = new Player('p1', 'p1');
  const p2 = new Player('p2', 'p2');
  room.addPlayer(p1);
  room.addPlayer(p2);

  console.log(`\nStarting Round 1: ${room.rounds[0].name}`);

  // Players submit answers
  p1.submitAnswers(0, ['p1a1', 'p1a2']);
  p2.submitAnswers(0, ['p2a1', 'p2a2']);

  // Grade round
  room.gradeRound(0);

  console.log('\nFinal Scores:');
  room.players.forEach(p => console.log(`${p.name}: ${p.score} points`));
}

simulateGame().catch(err => console.error(err));
