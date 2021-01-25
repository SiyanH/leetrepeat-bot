require('dotenv').config()
const { Telegraf, Markup, session } = require('telegraf')
const { Database } = require('./src/db/Database')
const {
  getUserQuestion,
  addUserQuestion,
  deleteUserQuestion,
  getNextQuestion,
  updateRecall
} = require('./src/services/userQuestionsService')
const { getQuestion } = require('./src/services/questionsService')

const bot = new Telegraf(process.env.BOT_TOKEN)
Database.client.connect()

const welcome = (name) =>
  `Hi ${name} 👋 

I'm a bot helping you practice LeetCode. Just tell me what LeetCode problems you'd like to practice again \
and I'll help you schedule the next rounds based on the forgetting curve.

Check all available actions with /help.`

const add = 'Start adding your LeetCode problem by sending me its question id (one per message, please 😊).'

const help = `<b>What can this bot do?</b>

This is a bot that can intelligently schedule your next LeetCode problems to practice again based on \
the forgetting curve. It uses a simple yet powerful model of forgetting (similar to Duolingo) to let you practice \
problems with least recall probabilities.

<a href="https://github.com/SiyanH/leetrepeat-bot">Code</a> is open source on GitHub.

<b>Available actions</b>

/start shows welcome message`

const questionURL = (titleSlug) => `https://leetcode.com/problems/${titleSlug}`

bot.use(session())
bot.use((ctx, next) => {
  if (!ctx.session) {
    ctx.session = {}
  }
  return next()
})

bot.start(ctx =>
  ctx.reply(welcome(ctx.from.first_name))
    .then(() =>
      ctx.reply(add)
    )
    .catch(r => console.log('Bot failed to start\n' + r))
)

bot.help(ctx => ctx.replyWithHTML(help))

bot.command('next', async ctx => {
  try {
    const userId = ctx.from.id
    ctx.reply(`Sit tight...I'm fetching your next LeetCode problem to practice 😎`)
    const question = await getNextQuestion(userId)
    await ctx.reply('Here is you next question. Practice makes perfect 💪')
    ctx.reply(questionURL(question.titleSlug))
  } catch (e) {
    console.error('Bot failed to process command /next\n' + e)
  }
})

bot.on('message', async ctx => {
  try {
    const userId = ctx.from.id
    const questionId = Number(ctx.message.text)

    if (isNaN(questionId) || !Number.isInteger(questionId)) {
      ctx.reply('Well, this is not a valid question id...Try again?')
    } else {
      const question = await getQuestion(questionId)
      const userQuestion = await getUserQuestion(questionId, userId)

      if (userQuestion) {
        ctx.session.userQuestion = userQuestion
        await ctx.replyWithHTML(`I've found this LeetCode problem in your question bucket.
You can <b>update</b> it with the recent status of your solution or <b>delete</b> it from your bucket.`)
        ctx.reply(questionURL(question.titleSlug), Markup.inlineKeyboard([
          Markup.button.callback('Delete', 'delete'),
          Markup.button.callback('Update', 'update')
        ]))
      } else {
        const res = await addUserQuestion(questionId, userId)
        if (res) {
          await ctx.reply(`Okay, I've added the following LeetCode problem to your question bucket 👍`)
          ctx.reply(questionURL(question.titleSlug))
        } else {
          ctx.reply(`Oops...Some error occurred so I couldn't add your question. Try again?`)
        }
      }
    }
  } catch (e) {
    console.error('Bot failed to process user message\n' + e)
  }
})

bot.action('update', async ctx => {
  try {
    await ctx.answerCbQuery()
    ctx.editMessageReplyMarkup(Markup.inlineKeyboard([
      Markup.button.callback('Rejected', 'rejected'),
      Markup.button.callback('Accepted', 'accepted')
    ]).reply_markup)
  } catch (e) {
    console.error(`Bot failed to process callback 'update'\n` + e)
  }
})

bot.action('delete', async ctx => {
  try {
    const res = await deleteUserQuestion(ctx.session.userQuestion._id)
    if (res) {
      ctx.answerCbQuery('Delete successful')
      ctx.editMessageText(`[Deleted] ${ctx.callbackQuery.message.text}`)
    } else {
      ctx.answerCbQuery('Delete failed')
    }
  } catch (e) {
    console.error(`Bot failed to process callback 'delete'\n` + e)
  }
})

bot.action('accepted', async ctx => {
  try {
    const res = await updateRecall(ctx.session.userQuestion, 1)
    if (res) {
      ctx.answerCbQuery('Update successful')
      ctx.editMessageText(`[Accepted] ${ctx.callbackQuery.message.text}`)
    } else {
      ctx.answerCbQuery('Update failed')
    }
  } catch (e) {
    console.error(`Bot failed to process callback 'accepted'\n` + e)
  }
})

bot.action('rejected', async ctx => {
  try {
    const res = await updateRecall(ctx.session.userQuestion, 0)
    if (res) {
      ctx.answerCbQuery('Update successful')
      ctx.editMessageText(`[Rejected] ${ctx.callbackQuery.message.text}`)
    } else {
      ctx.answerCbQuery('Update failed')
    }
  } catch (e) {
    console.error(`Bot failed to process callback 'rejected'\n` + e)
  }
})

bot.launch().catch(r => 'Bot failed to lunch\n' + r)

// Enable graceful stop
process.once('SIGINT', () => {
  bot.stop('SIGINT')
  Database.client.close()
})
process.once('SIGTERM', () => {
  bot.stop('SIGTERM')
  Database.client.close()
})
