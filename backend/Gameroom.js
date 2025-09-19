/**
 * Gameroom.js
 * ----------
 * Manages a game of trivia
 * 
 * Fields:
 * code: a string for the join code to give to the players
 * host: the host?
 * players: a list of player id's who are in the game
 * rounds: a list of round objects
 */

import Player from './Player.js';

class GameRoom {
  constructor(code, host) {
    this.code = code;
    this.host = host;
    this.players = [];
    this.rounds = [];
    this.currentRoundIndex = 0;
  }

  addPlayer(player) {
    this.players.push(player);
  }
}

export default GameRoom;