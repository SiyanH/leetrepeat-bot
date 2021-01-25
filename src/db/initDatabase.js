/**
 * This script creates initial collections for questions data.
 * Only run this script once when setting up a fresh database for the project.
 */
const { Database } = require('./Database')

/**
 * Create a collection of questions from LeetCode.
 */
async function createQuestions (db) {
  try {
    await db.createCollection('questions', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['id', 'titleSlug'],
          properties: {
            id: {
              bsonType: 'number',
              description: 'question id on LeetCode (same as frontend_question_id from LeetCode API)'
            },
            title: {
              bsonType: 'string',
              description: 'title of this question (same as question__title from LeetCode API)'
            },
            titleSlug: {
              bsonType: 'string',
              description: 'last part of the question URL pathname (same as question__title_slug from LeetCode API)'
            }
          }
        }
      }
    })
    await db.collection('questions').createIndex({ id: 1 })
    console.log('Created a collection of questions')
  } catch (e) {
    console.error('Failed to create a collection of questions\n' + e)
  }
}

/**
 * Create a collection of user questions to practice.
 * @param db: database instance for the project
 */
async function createUserQuestions (db) {
  try {
    await db.createCollection('userQuestions', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['userId', 'questionId', 'a', 'b', 't', 'recall', 'updatedAt'],
          properties: {
            userId: {
              bsonType: 'number',
              description: 'unique identifier for the telegram user associated with this question'
            },
            questionId: {
              bsonType: 'number',
              description: 'question id on LeetCode'
            },
            a: {
              bsonType: 'number',
              description: 'parameter for the ebisu model'
            },
            b: {
              bsonType: 'number',
              description: 'parameter for the ebisu model'
            },
            t: {
              bsonType: 'number',
              description: 'parameter for the ebisu model'
            },
            recall: {
              bsonType: 'number',
              description: 'expected recall of this question – a value for comparison between recall probabilities'
            },
            updatedAt: {
              bsonType: 'date'
            }
          }
        }
      }
    })
    await db.collection('userQuestions').createIndex({ questionId: 1 })
    await db.collection('userQuestions').createIndex({ recall: 1 })
    console.log('Created a collection of user questions')
  } catch (e) {
    console.error('Failed to create a collection of user questions\n' + e)
  }
}

(async function () {
  try {
    await Database.client.connect()
    await createQuestions(Database.db)
    await createUserQuestions(Database.db)
  } catch (e) {
    console.error('initDatabase: script failed\n' + e)
  } finally {
    await Database.client.close()
  }
})()
