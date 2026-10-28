const mysql = require('mysql2/promise')

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'zhizhen',
  waitForConnections: true,
  connectionLimit: 20,
  charset: 'utf8mb4',
  timezone: '+08:00',
  multipleStatements: true
})

function isTransientConnectionError(error) {
  return ['ECONNRESET', 'PROTOCOL_CONNECTION_LOST', 'ETIMEDOUT', 'EPIPE'].includes(error?.code)
}

async function queryWithRetry(executor) {
  try {
    return await executor()
  } catch (error) {
    if (!isTransientConnectionError(error)) throw error
    return executor()
  }
}

const db = {
  pool,

  async get(sql, params = []) {
    const [rows] = await queryWithRetry(() => pool.query(sql, params))
    return rows[0] || null
  },

  async all(sql, params = []) {
    const [rows] = await queryWithRetry(() => pool.query(sql, params))
    return rows
  },

  async run(sql, params = []) {
    const [result] = await queryWithRetry(() => pool.query(sql, params))
    return { insertId: result.insertId, affectedRows: result.affectedRows }
  },

  async exec(sql) {
    await queryWithRetry(() => pool.query(sql))
  },

  async transaction(fn) {
    const conn = await pool.getConnection()
    await conn.beginTransaction()
    try {
      const connDb = {
        async get(sql, params = []) {
          const [rows] = await conn.query(sql, params)
          return rows[0] || null
        },
        async all(sql, params = []) {
          const [rows] = await conn.query(sql, params)
          return rows
        },
        async run(sql, params = []) {
          const [result] = await conn.query(sql, params)
          return { insertId: result.insertId, affectedRows: result.affectedRows }
        },
        async exec(sql) {
          await conn.query(sql)
        }
      }
      const result = await fn(connDb)
      await conn.commit()
      return result
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  }
}

module.exports = { db }
