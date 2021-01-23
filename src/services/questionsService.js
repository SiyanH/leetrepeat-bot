const { Database } = require('../db/Database')

/**
 * Get a question.
 * @return {Promise<object>}
 */
async function getQuestion (id) {
  try {
    return Database.db.collection('questions').findOne({ id })
  } catch (e) {
    console.error('questionsService: getQuestion failed\n' + e)
    return null;
  }
}

module.exports = {
  getQuestion
}
