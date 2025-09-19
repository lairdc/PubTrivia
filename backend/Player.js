/**
 * Player.js
 * ----------
 * Represents a single player (or team) in a trivia game.
 * Tracks name, unique ID, and running score.
 * 
 * Fields:
 * id: The player's unique ID
 * name: custom name created by the player/team
 * score: the player's current score.
 */


class Player {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.score = 0;
  }

  addScore(points) {
    this.score += points;
  }
}