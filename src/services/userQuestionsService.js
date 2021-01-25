const { Database } = require('../db/Database')
const { getQuestion } = require('./questionsService')
const { diffHours } = require('../utils/dateUtil')
const ebisu = require('ebisu-js')

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
 * @return {Promise<number>} the inserted count
 */
async function addUserQuestion (questionId, userId) {
  try {
    const res = await Database.db.collection('userQuestions').insertOne({
      userId: userId,
      questionId: questionId,
      a: 3,
      b: 3,
      t: 24,
      recall: ebisu.predictRecall(ebisu.defaultModel(24, 3, 3), 0),
      updatedAt: new Date()
    })
    return res.insertedCount
  } catch (e) {
    console.error('userQuestionsService: addUserQuestion failed\n' + e)
    return 0
  }
}

/**
 * Delete a user question.
 * @param _id: user question id in database
 * @return {Promise<boolean>} true if successful, false otherwise
 */
async function deleteUserQuestion (_id) {
  try {
    const res = await Database.db.collection('userQuestions').deleteOne({ _id })
    return !!res
  } catch (e) {
    console.error('userQuestionsService: deleteUserQuestion failed\n' + e)
    return false
  }
}

/**
 * Get the next user question with the least value of recall.
 * @return {Promise<object>} a user question with title slug
 */
async function getNextQuestion (userId) {
  try {
    await predictRecalls(userId)
    const userQuestion = await Database.db.collection('userQuestions')
      .find({ userId: userId })
      .sort({ recall: 1 })
      .limit(1)
      .project({ questionId: 1 })
      .next()
    const { _id, questionId } = userQuestion
    const question = await getQuestion(questionId)

    if (!question) {
      console.error('userQuestionsService: getNextQuestion failed; question not found\n')
      return null
    }

    return { _id, userId, questionId, titleSlug: question.titleSlug }
  } catch (e) {
    console.error('userQuestionsService: getNextQuestion failed\n' + e)
    return null
  }
}

/**
 * Get all the user questions in ascending order of question id.
 * @param userId
 * @return {Promise<[object]>} an array of user questions with question details [{ _id, question: [{...}] }]
 */
async function getAllUserQuestions (userId) {
  try {
    return Database.db.collection('userQuestions')
      .aggregate([
        {
          $match: { userId: userId }
        },
        {
          $lookup:
            {
              from: 'questions',
              localField: 'questionId',
              foreignField: 'id',
              as: 'question'
            }
        }])
      .sort({ questionId: 1 })
      .project({ question: 1 })
      .toArray()
  } catch (e) {
    console.error('userQuestionsService: getAllUserQuestions failed\n' + e)
    return []
  }
}

/**
 * Predict current recall values for user questions.
 * @param userId
 * @return {Promise<boolean>} true if successful, false otherwise
 */
async function predictRecalls (userId) {
  try {
    const collection = Database.db.collection('userQuestions')
    const userQuestions = await collection.find({ userId: userId }).toArray()
    let updatedCount = 0

    for (const q of userQuestions) {
      const model = ebisu.defaultModel(q.t, q.a, q.b)
      const recall = ebisu.predictRecall(model, diffHours(q.updatedAt, new Date()))
      const res = await collection.updateOne({ _id: q._id }, { $set: { recall } })
      if (res) {
        updatedCount++
      }
    }

    return updatedCount === userQuestions.length
  } catch (e) {
    console.error('userQuestionsService: predictRecalls failed\n' + e)
    return false
  }
}

/**
 * Update recall values for a user question.
 * @param question: a user question object
 * @param success: 1 for accepted solution of the question, 0 otherwise
 * @return {Promise<boolean>} true if successful, false otherwise
 */
async function updateRecall (question, success) {
  try {
    const now = new Date()
    const model = ebisu.defaultModel(question.t, question.a, question.b)
    const newModel = ebisu.updateRecall(model, success, 1, diffHours(question.updatedAt, now))
    const res = await Database.db.collection('userQuestions')
      .updateOne({ _id: question._id }, {
        $set: {
          a: newModel[0],
          b: newModel[1],
          t: newModel[2],
          updatedAt: now
        }
      })
    return !!res
  } catch (e) {
    console.error('userQuestionsService: updateRecall failed\n' + e)
    return false
  }
}

module.exports = {
  getUserQuestion,
  addUserQuestion,
  deleteUserQuestion,
  getNextQuestion,
  getAllUserQuestions,
  updateRecall
}
