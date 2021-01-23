require('dotenv').config({ path: '../../.env' })
const { MongoClient } = require('mongodb')

class Database {
  static _client = null
  static _db = null

  static get client () {
    if (this._client === null) {
      this._client = new MongoClient(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    }
    return this._client
  }

  static get db () {
    if (this._db === null) {
      this._db = this.client.db()
    }
    return this._db
  }
}

module.exports = {
  Database
}
