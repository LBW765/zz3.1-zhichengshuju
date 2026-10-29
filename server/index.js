require('dotenv').config()
require('express-async-errors')

const useMockBackend = String(process.env.MOCK_BACKEND).toLowerCase() === 'true'
const { db } = useMockBackend ? { db: null } : require('./db')
const initSchema = useMockBackend ? null : require('./db/schema')
const seedData = useMockBackend ? null : require('./db/seed')

const PORT = process.env.PORT || 3131

async function start() {
  if (!useMockBackend) {
    await initSchema(db)
    await seedData(db)
  }

  const { createApp } = require('./app')
  const app = createApp()

  const server = app.listen(PORT, async () => {
    console.log(`\n  Backend started: http://localhost:${PORT}`)
    if (useMockBackend) {
      console.log('  Backend mode: in-memory mock (MySQL not required)')
    } else {
      const userRow = await db.get('SELECT COUNT(*) AS count FROM users')
      const menuRow = await db.get('SELECT COUNT(*) AS count FROM menus')
      console.log(`  Database: MySQL ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`)
      console.log(`  Users: ${userRow.count}, menus: ${menuRow.count}`)
    }
    console.log('  Preset accounts:')
    console.log('    administrator / 123456')
    console.log('    admin / 123456')
    console.log('    user / 123456\n')
  })

  function shutdown() {
    server.close(() => {
      if (db) {
        db.pool.end().then(() => process.exit(0))
      } else {
        process.exit(0)
      }
    })
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

start().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
