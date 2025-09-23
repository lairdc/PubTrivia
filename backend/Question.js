/**
 * Question.js
 * ----------
 * Represents a single question for players to answer and host to check.
 * 
 * Field:
 * Question: the text of the question to display to Players? and Host (for reading it aloud)
 * Answer: the answer to the question, used when marking responses
 * Points: an int representing the value of the question
 * Round: an int representing the # round this question belongs to. (could also be a string for the title of the round)
 */

class Question {
    constructor(question,answer,points,round){
        this.question = question
        this.answer = answer
        this.points = points
        this.round = round
    }
}