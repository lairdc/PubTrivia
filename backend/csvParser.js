// csvParser.js
import Round from './Round.js';
import Question from './Question.js';

export async function loadQuestionsFromCSVString(csvText) {
  const lines = csvText.split(/\r?\n/);
  const rounds = [];
  let currentRound = null;

  for (let rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // remove optional surrounding quotes
    const cleaned = trimmed.replace(/^"(.*)"$/, "$1");
    const parts = cleaned.split(',').map(x => x.trim());

    // Round title (1 column)
    if (parts.length === 1 && (/[a-zA-Z]/.test(parts[0]) || /\d/.test(parts[0]))) {
      if (currentRound && currentRound.questions.length === 0) {
        throw new Error(`Round "${currentRound.title}" has no questions.`);
      }

      const roundTitle = parts[0];
      currentRound = new Round(roundTitle);
      rounds.push(currentRound);
      continue;
    }

    // Question row (3 columns)
    if (parts.length === 3) {
      if (!currentRound)
        throw new Error(`Question found before any round header: "${rawLine}"`);

      const [questionText, answerText, pointsText] = parts;
      const points = parseInt(pointsText, 10);

      if (isNaN(points)) {
        throw new Error(`Invalid point value in line: "${rawLine}"`);
      }

      currentRound.addQuestion(new Question(questionText, answerText, points));
      continue;
    }

    throw new Error(`Invalid row format: "${rawLine}"`);
  }

  // Ensure last round has at least one question
  if (currentRound && currentRound.questions.length === 0) {
    throw new Error(`Round "${currentRound.title}" has no questions.`);
  }

  return rounds;
}
