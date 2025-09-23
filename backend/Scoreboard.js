/**
 * Scoreboard.js
 * ----------
 * Represents the scoreboard, useful keeping track of each teams score throughout the game
 * 
 * Fields:
 * players: either a list of references to a player object or just their ids
 * rounds: either a list of references to Round objects, or jus ttheir titles
 * points: A 2-D matrix of a teams scores over each round.
 */

class Scoreboard {
    constructor(players, rounds, points) {
        this.players = players
        this.rounds = rounds
        this.points = points
    }
}