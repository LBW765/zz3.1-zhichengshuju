require('dotenv').config()
const { aiDb, initAiSchema } = require('../db/ai')
const seedAi = require('../db/seedAi')

async function reset() {
  if (!aiDb.database.endsWith('_demo') || process.env.AI_DEMO_RESET !== '1') {
    throw new Error('仅允许重置名称以 _demo 结尾的库，且需显式设置 AI_DEMO_RESET=1')
  }
  await initAiSchema()
  await aiDb.transaction(async tx => {
    for (const table of ['ai_tokens', 'ai_application_events', 'ai_applications', 'ai_attachments', 'ai_demands', 'ai_suppliers', 'ai_catalog_items', 'ai_metrics', 'ai_users']) {
      await tx.run(`DELETE FROM ${table}`)
    }
  })
  await seedAi()
  console.log(`已重置 AI Demo ${aiDb.database}`)
}

reset().catch(error => { console.error(error.message); process.exitCode = 1 }).finally(() => aiDb.pool.end())
