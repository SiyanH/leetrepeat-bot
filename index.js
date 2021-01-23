require('dotenv').config()
const { Telegraf } = require('telegraf')

const bot = new Telegraf(process.env.BOT_TOKEN)

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

bot.start(ctx =>
  ctx.reply(welcome(ctx.from.first_name))
    .then(() =>
      ctx.reply(add)
    )
)

bot.help(ctx => ctx.replyWithHTML(help))

bot.on('message', ctx => {
  const userId = ctx.from.id
  const questionId = Number(ctx.message.text)
  if (isNaN(questionId) || !Number.isInteger(questionId)) {
    ctx.reply('Well, this is not a valid question id...Try again?')
  } else {
    ctx.reply(questionId)
  }
})

bot.launch()

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
