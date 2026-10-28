const { db } = require('../db')

function safeJson(value) {
  if (value === undefined) return null
  try {
    return JSON.stringify(value)
  } catch (_e) {
    return JSON.stringify({ error: 'serialize_failed' })
  }
}

async function log(req, options = {}) {
  const table = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='finance_audit_logs'")
  if (!table) return

  await db.run(`
    INSERT INTO finance_audit_logs (
      module, action, target_type, target_id, before_json, after_json, remark, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [options.module || '',
    options.action || '',
    options.targetType || '',
    options.targetId || null,
    safeJson(options.before),
    safeJson(options.after),
    options.remark || '',
    req?.user?.id || options.userId || 0])
}

module.exports = { log }
