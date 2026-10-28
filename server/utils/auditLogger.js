const { db } = require('../db')

const AUDIT_SQL = `INSERT INTO audit_logs (module, action, target_type, target_id, detail, ip, user_agent, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
const PAYROLL_AUDIT_SQL = `INSERT INTO payroll_audit_logs (payroll_id, action, detail, operator_id, ip) VALUES (?, ?, ?, ?, ?)`

function getRequestIp(req) {
  if (!req) return ''
  return (req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress || '').toString().split(',')[0].trim()
}

function getUserId(req) {
  return req?.user?.id || req?.user?.userId || 0
}

async function log(req, entry) {
  try {
    const detailStr = typeof entry.detail === 'string'
      ? entry.detail
      : JSON.stringify(entry.detail || {})
    await db.run(AUDIT_SQL, [
      entry.module,
      entry.action,
      entry.targetType || '',
      entry.targetId || null,
      detailStr,
      getRequestIp(req),
      (req?.headers?.['user-agent'] || '').slice(0, 255),
      getUserId(req)
    ])
  } catch (e) {
    console.error('[auditLogger] 写入失败:', e.message)
  }
}

async function logPayroll(req, entry) {
  try {
    const detailStr = typeof entry.detail === 'string'
      ? entry.detail
      : JSON.stringify(entry.detail || {})
    await db.run(PAYROLL_AUDIT_SQL, [
      entry.payrollId || null,
      entry.action,
      detailStr,
      getUserId(req),
      getRequestIp(req)
    ])
  } catch (e) {
    console.error('[auditLogger.payroll] 写入失败:', e.message)
  }
}

module.exports = { log, logPayroll }
