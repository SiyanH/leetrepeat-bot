require('dotenv').config()
const { Telegraf } = require('telegraf')

const bot = new Telegraf(process.env.BOT_TOKEN)
const welcome =
  `Hi there 👋 

I'm a bot helping you practice LeetCode problems. Just tell me what coding problems you'd like to practice again \
and I'll help you schedule the next rounds based on the forgetting curve.

Check all available actions with /help.`
const help = `<b>What can this bot do?</b>

This is a bot that can intelligently schedule your next LeetCode problems to practice again based on \
the forgetting curve. It uses a simple yet powerful model of forgetting (similar to Duolingo) to let you practice \
problems with least recall probabilities.

<a href="https://github.com/SiyanH/leetrepeat-bot">Code</a> is open source on GitHub.

<b>Available actions</b>

/start shows welcome message`

bot.start(ctx =>
  ctx.reply(welcome)
    .then(() =>
      ctx.reply('Start adding your LeetCode problems by giving me their question ids (one id per message, please 😊).')
    )
)
bot.help(ctx => ctx.replyWithHTML(help))
bot.on('message', ctx => console.log(ctx.message.text))
bot.launch()

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
