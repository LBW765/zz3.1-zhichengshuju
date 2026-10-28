const fs = require('fs')
const path = require('path')

async function initSchema(db) {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
  const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0)
  for (const stmt of statements) {
    try {
      await db.exec(stmt)
    } catch (e) {
      if (e.errno === 1061 || e.errno === 1050) continue
      throw e
    }
  }
}

module.exports = initSchema
