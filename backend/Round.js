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

class Round {
    constructor(questions,title){
        this.questions = questions
        this.title = title
    }
}