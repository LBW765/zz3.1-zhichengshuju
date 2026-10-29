require('dotenv').config()
require('express-async-errors')
const express = require('express')
const cors = require('cors')
const { aiDb, initAiSchema, useMock } = require('./db/ai')
const seedAi = require('./db/seedAi')

async function start() {
  if (!useMock) await initAiSchema()
  await seedAi()
  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '2mb' }))
  app.get('/', (_req, res) => res.json({
    code: 200,
    message: 'AI Demo API running',
    data: {
      mode: useMock ? 'in-memory mock' : 'mysql',
      api: '/ai',
      portal: '/ai/portal',
      admin: 'http://127.0.0.1:8131/ai-demo'
    }
  }))
  app.use('/ai', require('./routes/ai'))
  app.use((error, _req, res, _next) => {
    console.error('AI Demo API error:', error)
    res.json({ code: 500, message: '服务暂不可用，请稍后重试', data: null })
  })
  const port = Number(process.env.AI_PORT) || 3132
  const mode = useMock ? 'in-memory mock' : `database: ${aiDb.database}`
  const server = app.listen(port, '127.0.0.1', () => console.log(`AI Demo API: http://127.0.0.1:${port}/ai, mode: ${mode}`))
  const close = () => server.close(() => aiDb.pool.end().then(() => process.exit(0)))
  process.on('SIGINT', close)
  process.on('SIGTERM', close)
}

start().catch(error => { console.error('AI Demo API failed to start:', error.code || error.message); process.exit(1) })
