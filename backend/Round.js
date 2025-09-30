/**
 * Round.js
 * ----------
 * Represents a single round of questions, 
 * each with their own answer, point value, and the actual question
 * 
 * Fields:
 * Questions: A list of Question objects that are a part of this round
 * Title:  A tring representing the title of the round (ex: History, Geography...)
 *  
 */

// Round.js
class Round {
  constructor(name) {
    this.name = name;
    this.questions = [];
  }

  addQuestion(question) {
    this.questions.push(question);
  }
}

export default Round;