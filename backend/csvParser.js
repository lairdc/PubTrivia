import fs from 'fs';
import readline from 'readline';
import Round from './Round.js';
import Question from './Question.js';

/**
 * Parses a CSV with the format:
 * Round #, Round Name
 * Question #, Question, Answer, Points
 *
 * Returns an array of Round objects.
 *
 * @param {string} path - path to CSV file
 * @returns {Promise<Round[]>}
 */
export async function loadQuestionsFromCSV(path) {
  const rounds = [];
  let currentRound = null;

  const fileStream = fs.createReadStream(path);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue; // skip empty lines

    const parts = line.split(',').map(p => p.trim());

    // Round row: exactly 2 columns
    if (parts.length === 2) {
      const roundNumber = parts[0];
      const roundName = parts[1];
      currentRound = new Round(roundName);
      rounds.push(currentRound);
    }
    // Question row: exactly 4 columns
    else if (parts.length === 4) {
      if (!currentRound) {
        throw new Error(`Question found before any round: ${line}`);
      }

      const questionNumber = parts[0]; // optional
      const questionText = parts[1];
      const answerText = parts[2];
      const points = parseInt(parts[3], 10);

      const question = new Question(questionText, answerText, points);
      currentRound.addQuestion(question);
    } 
    else {
      throw new Error(`Invalid row format: ${line}`);
    }
  }

  return rounds;
}
