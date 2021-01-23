/**
 * This script adds all existing LeetCode problems to the collection of questions.
 * Only run this script once after creating a collection of questions.
 */
const fetch = require('node-fetch')
const { Database } = require('./Database')

async function getQuestions () {
  try {
    const response = await fetch('https://leetcode.com/api/problems/all')
    const json = await response.json()
    return json.stat_status_pairs.map(s => ({
      id: s.stat.frontend_question_id,
      titleSlug: s.stat.question__title_slug
    }))
  } catch (e) {
    console.error('Failed to get questions from LeetCode\n' + e)
  }
}

async function addQuestions (collection) {
  try {
    const questions = await getQuestions()
    const res = await collection.insertMany(questions)
    return res.insertedCount
  } catch (e) {
    console.error('Failed to add LeetCode problems to the collection of questions\n' + e)
  }
}

(async function () {
  try {
    const count = await addQuestions(Database.db.collection('questions'))
    console.log(`Added ${count} LeetCode problems to the collection of questions`)
  } catch (e) {
    console.error('addQuestions: script failed\n' + e)
  }
})()
