//import GameRoom from './GameRoom.js';
import Player from './Player.js';
import { loadQuestionsFromCSV } from './csvParser.js';

async function simulateGame() {
  const room = new GameRoom('ABCD', { id: 'host1', name: 'Host' });
  room.rounds = await loadQuestionsFromCSV('./questions.csv');

  // Add players
  const alice = new Player('p1', 'Alice');
  const bob = new Player('p2', 'Bob');
  room.addPlayer(alice);
  room.addPlayer(bob);

  console.log(`\nStarting Round 1: ${room.rounds[0].name}`);

  // Players submit answers
  alice.submitAnswers(0, ['George Washington', 'John Wilkes Booth']);
  bob.submitAnswers(0, ['Abraham Lincoln', 'John Wilkes Booth']);

  // Grade round
  room.gradeRound(0);

  console.log('\nFinal Scores:');
  room.players.forEach(p => console.log(`${p.name}: ${p.score} points`));
}

simulateGame().catch(err => console.error(err));
