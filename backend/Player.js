/**
 * Player.js
 * ----------
 * Represents a single player (or team) in a trivia game.
 * Tracks name, unique ID, and running score.
 * 
 * Fields:
 * id: The player's unique ID
 * name: custom name created by the player/team
 * scores:a list of score's for each completed round.
 * answers: a list of the current rounds answers, updated when the player submits their answers, and then is grabbed by gameroom for scoring.
 */


// Player.js
class Player {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.score = 0;
    this.answers = {}; // roundIndex -> [answers]
  }

  submitAnswers(roundIndex, answers) {
    if (!Array.isArray(answers) || answers.length === 0) {
      throw new Error(`Invalid answers submitted by ${this.name}`);
    }
    this.answers[roundIndex] = answers;
  }

  addScore(points) {
    this.score += points;
  }
}

export default Player;
