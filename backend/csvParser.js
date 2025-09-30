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

    // strip optional surrounding quotes
    const cleaned = trimmed.replace(/^"(.*)"$/, '$1');
    const parts = cleaned.split(',').map(p => p.trim());

    // Round header
    if (parts.length === 2 && !isNaN(parts[0])) {
      // if the previous round had no questions, throw
      if (currentRound && currentRound.questions.length === 0) {
        throw new Error(`Round "${currentRound.title}" has no questions.`);
      }

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

  // Final check: last round isn’t empty
  if (currentRound && currentRound.questions.length === 0) {
    throw new Error(`Round "${currentRound.title}" has no questions.`);
  }

  return rounds;
}
