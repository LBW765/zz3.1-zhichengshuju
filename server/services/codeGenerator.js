const { db } = require('../db')

async function generateCode(ruleCode) {
  const rule = await db.get('SELECT * FROM code_rules WHERE code = ?', [ruleCode])
  if (!rule) throw new Error(`编码规则 [${ruleCode}] 不存在`)
  if (!rule.enabled) throw new Error(`编码规则 [${ruleCode}] 已停用`)

  const segments = await db.all('SELECT * FROM code_rule_segments WHERE rule_id = ? ORDER BY sort ASC', [rule.id])
  if (!segments.length) throw new Error(`编码规则 [${ruleCode}] 未配置段`)

  return db.transaction(async (conn) => {
    const parts = []
    const now = new Date()

    for (const segment of segments) {
      const config = typeof segment.config === 'string' ? JSON.parse(segment.config) : segment.config

      if (segment.type === 'fixed') {
        parts.push(config.value || '')
      } else if (segment.type === 'date') {
        parts.push(formatDate(now, config.format || 'YYYYMMDD'))
      } else if (segment.type === 'sequence') {
        parts.push(await getNextSequence(conn, segment.id, config, now))
      } else {
        throw new Error(`未知段类型: ${segment.type}`)
      }
    }

    return parts.join('')
  })
}

function formatDate(date, format) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const map = {
    YYYY: String(year),
    YY: String(year).slice(-2),
    MM: month,
    DD: day
  }

  return format.replace(/YYYY|YY|MM|DD/g, match => map[match] || '')
}

async function getNextSequence(conn, segmentId, config, now) {
  const length = config.length || 4
  const start = config.start || 1
  const step = config.step || 1
  const resetCycle = config.resetCycle || 'none'
  const padChar = config.padChar || '0'
  const cycleKey = getCycleKey(now, resetCycle)

  await conn.run(
    `INSERT INTO code_sequences (segment_id, cycle_key, current_seq, updated_at)
     VALUES (?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE current_seq = current_seq + VALUES(current_seq) - ? + ?, updated_at = NOW()`,
    [segmentId, cycleKey, start, start, step]
  )

  const row = await conn.get('SELECT current_seq FROM code_sequences WHERE segment_id = ? AND cycle_key = ?', [segmentId, cycleKey])
  return String(row.current_seq).padStart(length, padChar)
}

function getCycleKey(date, resetCycle) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  switch (resetCycle) {
    case 'year':
      return String(year)
    case 'month':
      return `${year}-${month}`
    case 'day':
      return `${year}-${month}-${day}`
    case 'none':
    default:
      return '_'
  }
}

async function previewNextCode(ruleCode) {
  const rule = await db.get('SELECT * FROM code_rules WHERE code = ?', [ruleCode])
  if (!rule) throw new Error(`编码规则 [${ruleCode}] 不存在`)
  if (!rule.enabled) throw new Error(`编码规则 [${ruleCode}] 已停用`)

  const segments = await db.all('SELECT * FROM code_rule_segments WHERE rule_id = ? ORDER BY sort ASC', [rule.id])
  if (!segments.length) throw new Error(`编码规则 [${ruleCode}] 未配置段`)

  const parts = []
  const now = new Date()

  for (const segment of segments) {
    const config = typeof segment.config === 'string' ? JSON.parse(segment.config) : segment.config

    if (segment.type === 'fixed') {
      parts.push(config.value || '')
    } else if (segment.type === 'date') {
      parts.push(formatDate(now, config.format || 'YYYYMMDD'))
    } else if (segment.type === 'sequence') {
      const length = config.length || 4
      const start = config.start || 1
      const step = config.step || 1
      const padChar = config.padChar || '0'
      const cycleKey = getCycleKey(now, config.resetCycle || 'none')
      const row = await db.get('SELECT current_seq FROM code_sequences WHERE segment_id = ? AND cycle_key = ?', [segment.id, cycleKey])
      parts.push(String(row ? row.current_seq + step : start).padStart(length, padChar))
    } else {
      throw new Error(`未知段类型: ${segment.type}`)
    }
  }

  return parts.join('')
}

function previewCode(segments) {
  const now = new Date()

  return segments.map(segment => {
    const config = segment.config || {}
    if (segment.type === 'fixed') return config.value || ''
    if (segment.type === 'date') return formatDate(now, config.format || 'YYYYMMDD')
    if (segment.type === 'sequence') return String(1).padStart(config.length || 4, config.padChar || '0')
    throw new Error(`未知段类型: ${segment.type}`)
  }).join('')
}

async function resolveBusinessCode(ruleCode, providedCode, fallbackPrefix = '') {
  const normalizedCode = String(providedCode || '').trim()

  if (normalizedCode) {
    try {
      const preview = await previewNextCode(ruleCode)
      if (normalizedCode !== preview) return normalizedCode
    } catch (_e) {
      return normalizedCode
    }
  }

  try {
    return await generateCode(ruleCode)
  } catch (_e) {
    return `${fallbackPrefix}${Date.now()}`
  }
}

module.exports = { generateCode, previewCode, previewNextCode, resolveBusinessCode }
