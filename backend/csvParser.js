import fs from 'fs';
import readline from 'readline';
import Round from './Round.js';
import Question from './Question.js';

export async function loadQuestionsFromCSV(path) {
  const rounds = [];
  let currentRound = null;

  const fileStream = fs.createReadStream(path);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue; // skip empty lines

    const parts = trimmed.split(',').map(p => p.trim());

    // Round header row
    if (parts.length === 2 && !isNaN(parts[0])) {
      const roundName = parts[1];
      currentRound = new Round(roundName);
      rounds.push(currentRound);
    }
    // Question row
    else if (parts.length === 4 && !isNaN(parts[0])) {
      if (!currentRound) throw new Error(`Question before any round: ${line}`);

      const questionText = parts[1];
      const answerText = parts[2];
      const points = parseInt(parts[3], 10);

      currentRound.addQuestion(new Question(questionText, answerText, points));
    }
    else {
      throw new Error(`Invalid row format: ${line}`);
    }
  }

  return rounds;
}
