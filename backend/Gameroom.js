/**
 * GameRoom.js
 * ----------
 * Manages a game of trivia
 * 
 * Fields:
 * code: a string for the join code to give to the players
 * host: the host?
 * players: a list of player objects who are in the game
 * rounds: a list of round objects
 */

import readline from 'readline';
import Player from './Player.js';
import Round from './Round.js'

class GameRoom {
  constructor(code, host) {
    this.code = code;
    this.host = host;
    this.players = [host];
    this.rounds = [];
    this.currentRoundIndex = 0;
    this.started = false
  }



  //Player Management Methods

addPlayer(player) {
  const exists = this.players.some(
    p => p.id === player.id || p.name === player.name
  );

  if (!exists) {
    this.players.push(player);
    return true; // success
  }

  return false; // duplicate found
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

  //Round Management

  startGame() {
    this.started = true;
  }


  startNextRound() {
    if (this.currentRoundIndex + 1 >= this.rounds.length) return false;
    this.currentRoundIndex += 1;
    return true;
  }

  //Answer Handling/Grading

  getAnswersFromPlayer(PlayerID) {
    player = this.players.find(p => p.id === playerID) || null;
    return player.answers
  }

  updateScoreForPlayer(PlayerID, score) {
    player = this.players.find(p => p.id === playerID) || null;
    player.scores.push(score);
  }


  gradeRoundForPlayer(playerId, roundIndex, results) {
    const player = this.getPlayer(playerId);
    if (!player) throw new Error(`Player ${playerId} not found`);

    const round = this.rounds[roundIndex];
    if (!round) throw new Error(`Round ${roundIndex} not found`);

    let roundPoints = 0;

    for (const { questionId, correct } of results) {
      const question = round.questions.find(q => q.id === questionId);
      if (!question) continue; // skip unknown question IDs
      if (correct) {
        roundPoints += question.points;
      }
    }

    player.score += roundPoints;
    return roundPoints;
  }

  // GameRoom.js
  recordAnswers(playerId, roundIndex, answers) {
    const player = this.getPlayer(playerId);
    if (!player) throw new Error(`Player ${playerId} not found`);
    const round = this.rounds[roundIndex];
    if (!round) throw new Error(`Invalid round index ${roundIndex}`);

    player.submitAnswers(roundIndex, answers);
    console.log(`${player.name} submitted answers for Round ${roundIndex + 1}`);
  }

  async gradeRound(roundIndex) {
    const round = this.rounds[roundIndex];
    if (!round) throw new Error(`Round ${roundIndex} does not exist.`);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log(`\n=== Grading Round: ${round.name} ===`);

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