/**
 * GameRoom.js
 * ----------
 * Manages a game of trivia
 *
 * Fields:
 * code: a string for the join code to give to the players
 * host: the host (not a player)
 * players: a list of player objects who are in the game
 * rounds: a list of Round objects
 */

import readline from 'readline';
import Player from './Player.js';
import Round from './Round.js';

class GameRoom {
  constructor(code, hostId, hostName) {
    this.code = code;
    this.host = { id: hostId, name: hostName }; // host is not a player
    this.players = []; // players only
    this.rounds = [];
    this.currentRoundIndex = 0;
    this.started = false;

    // 'lobby' | 'answering' | 'grading' | 'betweenRounds' | 'finished'
    this.phase = 'lobby';

    // roundIndex -> { [playerId]: answersArray }
    this.submissions = {};

    // grading
    this.gradingQueue = []; // array of { roundIndex, questionIndex, playerId }
    this.gradingIndex = 0;

    // roundIndex -> { [playerId]: pointsForThatRound }
    this.roundScores = {};
    // roundIndex -> boolean (whether we've added them to Player.score)
    this.roundScoresApplied = {};
  }

  // -------- Player Management --------

  addPlayer(player) {
    const exists = this.players.some(
      p => p.id === player.id || p.name === player.name
    );
    if (!exists) {
      this.players.push(player);
      return true;
    }
    return false;
  }

  removePlayer(playerID) {
    const index = this.players.findIndex(p => p.id === playerID);
    if (index === -1) return false;
    this.players.splice(index, 1);
    return true;
  }

  getPlayer(playerID) {
    return this.players.find(p => p.id === playerID) || null;
  }

  // -------- Rounds / Phase Management --------

  getCurrentRound() {
    return this.rounds[this.currentRoundIndex] || null;
  }

  startGame() {
    this.started = true;
    this.phase = 'answering';
    this.currentRoundIndex = 0;
    this._resetRoundState(this.currentRoundIndex);
  }

  startNextRound() {
    if (this.currentRoundIndex + 1 >= this.rounds.length) {
      // no more rounds, game finished
      this.phase = 'finished';
      return false;
    }
    this.currentRoundIndex += 1;
    this.phase = 'answering';
    this._resetRoundState(this.currentRoundIndex);
    return true;
  }

  _resetRoundState(roundIndex) {
    // clear submissions & grading state for this round
    this.submissions[roundIndex] = {};
    this.gradingQueue = [];
    this.gradingIndex = 0;
    this.roundScores[roundIndex] = {};
    this.roundScoresApplied[roundIndex] = false;
  }

  // -------- Submissions --------

  /**
   * Record a player's answers for a given round.
   * answers: array of plain strings, one per question.
   */
  recordAnswers(playerId, roundIndex, answers) {
    const player = this.getPlayer(playerId);
    if (!player) throw new Error(`Player ${playerId} not found`);

    const round = this.rounds[roundIndex];
    if (!round) throw new Error(`Round ${roundIndex} not found`);

    if (!Array.isArray(answers) || answers.length !== round.questions.length) {
      throw new Error(
        `Expected ${round.questions.length} answers, got ${answers.length}`
      );
    }

    // store on player (for potential future use)
    player.answers[roundIndex] = answers;

    // store in room submissions
    if (!this.submissions[roundIndex]) {
      this.submissions[roundIndex] = {};
    }
    this.submissions[roundIndex][playerId] = answers;
  }

  hasPlayerSubmitted(roundIndex, playerId) {
    const roundSubs = this.submissions[roundIndex] || {};
    return Object.prototype.hasOwnProperty.call(roundSubs, playerId);
  }

  submissionCounts(roundIndex) {
    const subs = this.submissions[roundIndex] || {};
    const submittedCount = Object.keys(subs).length;
    const totalPlayers = this.players.length;
    return { submittedCount, totalPlayers };
  }

  allPlayersSubmitted(roundIndex) {
    const { submittedCount, totalPlayers } = this.submissionCounts(roundIndex);
    return totalPlayers > 0 && submittedCount === totalPlayers;
  }

  // -------- Grading --------

  /**
   * Build grading queue for current round (only for players that submitted).
   * Each entry is { roundIndex, questionIndex, playerId }.
   * Non-submitting players get 0 for the round (implicitly).
   */
  initGradingForCurrentRound() {
    const roundIndex = this.currentRoundIndex;
    const round = this.getCurrentRound();
    if (!round) throw new Error(`No current round at index ${roundIndex}`);

    const subs = this.submissions[roundIndex] || {};
    const queue = [];

    for (const playerId of Object.keys(subs)) {
      const answers = subs[playerId];
      for (let qIndex = 0; qIndex < round.questions.length; qIndex++) {
        queue.push({ roundIndex, questionIndex: qIndex, playerId });
      }
    }

    this.gradingQueue = queue;
    this.gradingIndex = 0;
    this.phase = 'grading';
  }

  /**
   * Return the next answer to grade or null if finished.
   */
  getNextGradeItem() {
    if (!this.gradingQueue || this.gradingQueue.length === 0) {
      return null;
    }
    if (this.gradingIndex >= this.gradingQueue.length) {
      return null;
    }

    const item = this.gradingQueue[this.gradingIndex];
    const round = this.rounds[item.roundIndex];
    const question = round.questions[item.questionIndex];
    const player = this.getPlayer(item.playerId);
    const subs = this.submissions[item.roundIndex] || {};
    const playerAnswers = subs[item.playerId] || [];
    const answerText = playerAnswers[item.questionIndex] ?? '';

    return {
      ...item,
      questionText: question.text,
      correctAnswer: question.answer,
      points: question.points,
      playerName: player ? player.name : '(Unknown player)',
      playerAnswer: answerText,
      totalItems: this.gradingQueue.length,
      currentIndex: this.gradingIndex + 1
    };
  }

  /**
   * Apply grade for a single question.
   * correct = true => award full points for that question, but do NOT
   * immediately add to Player.score; we store in roundScores and apply
   * them in bulk when grading finishes, so the scoreboard only updates
   * once per round.
   */
  applyGrade(roundIndex, questionIndex, playerId, correct) {
    const round = this.rounds[roundIndex];
    if (!round) throw new Error(`Round ${roundIndex} not found`);

    const question = round.questions[questionIndex];
    if (!question) throw new Error(`Question ${questionIndex} not found`);

    if (!this.roundScores[roundIndex]) {
      this.roundScores[roundIndex] = {};
    }
    if (!this.roundScores[roundIndex][playerId]) {
      this.roundScores[roundIndex][playerId] = 0;
    }

    if (correct) {
      this.roundScores[roundIndex][playerId] += question.points;
    }

    // advance grading pointer
    this.gradingIndex += 1;

    // if we're done grading this round, finalize scores
    if (this.gradingIndex >= this.gradingQueue.length) {
      this._finalizeRoundScores(roundIndex);
    }
  }

  _finalizeRoundScores(roundIndex) {
    if (this.roundScoresApplied[roundIndex]) return;

    const scoresForRound = this.roundScores[roundIndex] || {};
    for (const [playerId, pts] of Object.entries(scoresForRound)) {
      const player = this.getPlayer(playerId);
      if (player) {
        player.score += pts;
      }
    }

    this.roundScoresApplied[roundIndex] = true;
    this.phase = 'betweenRounds';
  }

  // (Old CLI-based grading method still here if you ever use it manually)
  async gradeRound(roundIndex) {
    const round = this.rounds[roundIndex];
    if (!round) throw new Error(`Round ${roundIndex} does not exist.`);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log(`\n=== Grading Round: ${round.title} ===`);

    for (let qIndex = 0; qIndex < round.questions.length; qIndex++) {
      const question = round.questions[qIndex];
      console.log(`\nQuestion ${qIndex + 1}: ${question.text}`);
      console.log(`Correct answer: ${question.answer}`);

      for (const player of this.players) {
        const playerAnswer = player.answers?.[roundIndex]?.[qIndex] ?? '(no answer)';
        console.log(`\n${player.name}'s answer: ${playerAnswer}`);

        const result = await new Promise(resolve => {
          rl.question(`Mark correct? (y/n): `, ans => {
            resolve(ans.trim().toLowerCase() === 'y');
          });
        });

        if (result) {
          player.score += question.points;
          console.log(`${player.name} +${question.points} points`);
        } else {
          console.log(`${player.name} no points`);
        }
      }
    }

    rl.close();
    console.log(`\n=== Round Complete ===`);
    for (const player of this.players) {
      console.log(`${player.name}: ${player.score} points`);
    }
  }
}

export default GameRoom;
