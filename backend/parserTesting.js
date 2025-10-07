import { loadQuestionsFromCSV } from './csvParser.js';
//import GameRoom from './GameRoom.js';

async function setupRoom() {
  const room = new GameRoom('ABCD', { id: 'host1', name: 'Host' });
  const rounds = await loadQuestionsFromCSV('./wrong_questions.csv');
  room.rounds = rounds;
  return room;
}

// ----- Test Runner -----
(async () => {
  try {
    const room = await setupRoom();

    console.log('=== Game Room Summary ===');
    console.log(`Join Code: ${room.code}`);
    console.log(`Host: ${room.host.name}`);
    console.log(`Number of Rounds: ${room.rounds.length}`);

    room.rounds.forEach((round, rIdx) => {
      console.log(`\nRound ${rIdx + 1}: ${round.name}`);
      round.questions.forEach((q, qIdx) => {
        console.log(
          `  Q${qIdx + 1}: ${q.question} | Answer: ${q.answer} | Points: ${q.points}`
        );
      });
    });

    console.log('\nParsing complete');
  } catch (err) {
    console.error('Error while testing parser:', err);
  }
})();

