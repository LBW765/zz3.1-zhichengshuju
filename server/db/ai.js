const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')

const database = process.env.AI_DB_NAME || 'jian_ai_demo'
if (!/^[a-zA-Z0-9_]+_demo$/.test(database)) throw new Error('AI_DB_NAME 必须以 _demo 结尾')

const connection = {
  host: process.env.AI_DB_HOST || '127.0.0.1',
  port: Number(process.env.AI_DB_PORT) || 3306,
  user: process.env.AI_DB_USER || 'root',
  password: process.env.AI_DB_PASSWORD || '',
  charset: 'utf8mb4',
  timezone: '+08:00'
}
const pool = mysql.createPool({ ...connection, database, waitForConnections: true, connectionLimit: 10 })

const aiDb = {
  database,
  pool,
  async get(sql, params = []) { const [rows] = await pool.execute(sql, params); return rows[0] || null },
  async all(sql, params = []) { const [rows] = await pool.execute(sql, params); return rows },
  async run(sql, params = []) { const [result] = await pool.execute(sql, params); return result },
  async transaction(fn) {
    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      const tx = {
        async get(sql, params = []) { const [rows] = await conn.execute(sql, params); return rows[0] || null },
        async all(sql, params = []) { const [rows] = await conn.execute(sql, params); return rows },
        async run(sql, params = []) { const [result] = await conn.execute(sql, params); return result }
      }
      const result = await fn(tx)
      await conn.commit()
      return result
    } catch (error) {
      await conn.rollback()
      throw error
    } finally {
      conn.release()
    }
  }
}

async function initAiSchema() {
  const setup = await mysql.createConnection(connection)
  try {
    await setup.query(`CREATE DATABASE IF NOT EXISTS ${mysql.escapeId(database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  } finally {
    await setup.end()
  }
  const sql = fs.readFileSync(path.join(__dirname, 'aiSchema.sql'), 'utf8')
  for (const statement of sql.split(';').map(part => part.trim()).filter(Boolean)) {
    await pool.query(statement)
  }
}

module.exports = { aiDb, initAiSchema }
