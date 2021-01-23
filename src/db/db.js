require('dotenv').config()
const { MongoClient } = require('mongodb')

class Database {
  static _client = null

  static get client () {
    if (this._client === null) {
      this._client = new MongoClient(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    }
    return this._client
  }

  static async connect () {
    await this.client.connect()
    return this.client.db()
  }

  static async close () {
    await this.client.close()
  }
}

module.exports = {
  Database
}
