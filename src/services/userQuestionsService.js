const { Database } = require('../db/Database')

/**
 * Get a user question.
 * @return {Promise<object>}
 */
async function getUserQuestion (questionId, userId) {
  try {
    return Database.db.collection('userQuestions').findOne({ userId: userId, questionId: questionId })
  } catch (e) {
    console.error('userQuestionsService: getUserQuestion failed\n' + e)
    return null
  }
}

/**
 * Add a LeetCode problem to the collection of user questions.
 * @param questionId: question id on LeetCode
 * @param userId: telegram user id
 * @return {Promise<int>} the inserted count
 */
async function addUserQuestion (questionId, userId) {
  try {
    const res = await Database.db.collection('userQuestions').insertOne({
      userId: userId,
      questionId: questionId,
      a: 3,
      b: 3,
      t: 3,
      recallProbabilities: 1,
      updatedAt: new Date()
    })
    return res.insertedCount
  } catch (e) {
    console.error('userQuestionsService: addUserQuestion failed\n' + e)
    return 0
  }
}

module.exports = {
  getUserQuestion,
  addUserQuestion
}
