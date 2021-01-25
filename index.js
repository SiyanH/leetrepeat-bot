require('dotenv').config()
const { Telegraf, Markup, session } = require('telegraf')
const { Database } = require('./src/db/Database')
const {
  getUserQuestion,
  addUserQuestion,
  deleteUserQuestion,
  getNextQuestion,
  getAllUserQuestions,
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

Add or update a problem simply by sending its LeetCode question id to the bot. 

<a href="https://github.com/SiyanH/leetrepeat-bot">Code</a> is open source on GitHub.

<b>Available actions</b>

/start shows welcome message
/next fetches your next problem
/all lists all your problems`

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

bot.command('all', async ctx => {
  try {
    const questions = await getAllUserQuestions(ctx.from.id)

    // Split questions to show on multiple pages if number of questions is over limit
    if (questions.length) {
      let html = ''
      const limit = 10 // number of questions shown on each page
      ctx.session.userQuestionsHTML = []

      for (let i = 0; i < questions.length; i++) {
        if (i > 0 && i % limit === 0) {
          ctx.session.userQuestionsHTML.push(html)
          html = ''
        }
        const url = questionURL(questions[i].question[0].titleSlug)
        html += `<a href="${url}">${questions[i].question[0].id}. ${questions[i].question[0].title}</a>\n`
      }
      ctx.session.userQuestionsHTML.push(html)
      ctx.session.userQuestionsPage = 0

      ctx.replyWithHTML(ctx.session.userQuestionsHTML[0], {
        disable_web_page_preview: true,
        reply_markup: ctx.session.userQuestionsHTML[1]
          ? Markup.inlineKeyboard([Markup.button.callback('>>', 'next_page')]).reply_markup : []
      })
    } else {
      ctx.reply(`You haven't got any problem in your bucket. Try adding one?`)
    }
  } catch (e) {
    console.error('Bot failed to process command /all\n' + e)
  }
})

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

bot.action('next_page', async ctx => {
  try {
    await ctx.answerCbQuery()
    const html = ctx.session.userQuestionsHTML[++ctx.session.userQuestionsPage]
    let reply_markup

    if (ctx.session.userQuestionsHTML[ctx.session.userQuestionsPage + 1]) {
      reply_markup = Markup.inlineKeyboard([
        Markup.button.callback('<<', 'previous_page'),
        Markup.button.callback('>>', 'next_page')
      ]).reply_markup
    } else {
      reply_markup = Markup.inlineKeyboard([
        Markup.button.callback('<<', 'previous_page'),
      ]).reply_markup
    }

    ctx.editMessageText(html, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup
    })
  } catch (e) {
    console.error(`Bot failed to process callback 'next_page'\n` + e)
  }
})

bot.action('previous_page', async ctx => {
  try {
    await ctx.answerCbQuery()
    const html = ctx.session.userQuestionsHTML[--ctx.session.userQuestionsPage]
    let reply_markup

    if (ctx.session.userQuestionsHTML[ctx.session.userQuestionsPage - 1]) {
      reply_markup = Markup.inlineKeyboard([
        Markup.button.callback('<<', 'previous_page'),
        Markup.button.callback('>>', 'next_page')
      ]).reply_markup
    } else {
      reply_markup = Markup.inlineKeyboard([
        Markup.button.callback('>>', 'next_page')
      ]).reply_markup
    }

    ctx.editMessageText(html, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup
    })
  } catch (e) {
    console.error(`Bot failed to process callback 'previous_page'\n` + e)
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
