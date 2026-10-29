const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ')
const clone = value => JSON.parse(JSON.stringify(value))
const like = (value, pattern) => String(value || '').toLowerCase().includes(String(pattern || '').replace(/^%|%$/g, '').toLowerCase())

const tables = ['ai_users', 'ai_tokens', 'ai_demands', 'ai_suppliers', 'ai_catalog_items', 'ai_attachments', 'ai_applications', 'ai_application_events', 'ai_metrics']
const state = Object.fromEntries(tables.map(name => [name, []]))
const counters = Object.fromEntries(tables.map(name => [name, 1]))

const nextId = table => counters[table]++
const add = (table, row) => {
  const value = { id: nextId(table), created_at: now(), updated_at: now(), ...row }
  state[table].push(value)
  return value
}
const table = name => state[name]
const findById = (name, id) => table(name).find(row => row.id === Number(id)) || null
const parseJson = value => {
  if (Array.isArray(value)) return value
  try { return JSON.parse(value || '[]') } catch (_error) { return [] }
}
const limit = (rows, count) => rows.slice(0, count)

function userByToken(tokenHash) {
  const token = table('ai_tokens').find(row => row.token_hash === tokenHash && row.expires_at > now())
  return token ? table('ai_users').find(row => row.id === token.user_id) : null
}

function selectRows(sql, params) {
  const normalized = sql.replace(/\s+/g, ' ').trim()
  if (normalized.includes('FROM ai_users WHERE username=')) return table('ai_users').filter(row => row.username === params[0]).map(clone)
  if (normalized.includes('FROM ai_users WHERE username=?') || normalized.includes('FROM ai_users WHERE username = ?')) return table('ai_users').filter(row => row.username === params[0]).map(clone)
  if (normalized.includes('FROM ai_tokens t JOIN ai_users u')) {
    const user = userByToken(params[0])
    return user ? [{ id: user.id, username: user.username, display_name: user.display_name, company: user.company, role: user.role, status: user.status }] : []
  }
  if (normalized.includes('FROM ai_demands')) {
    let rows = table('ai_demands').map(clone)
    if (/WHERE id=\?/.test(normalized)) rows = rows.filter(row => row.id === Number(params[0]) && (!/created_by=\?/.test(normalized) || row.created_by === Number(params[1])))
    else {
      let index = 0
      if (/industry=\?/.test(normalized)) { const value = params[index++]; rows = rows.filter(row => row.industry === value) }
      if (/status=\?/.test(normalized)) { const value = params[index++]; rows = rows.filter(row => row.status === value) }
      if (/scene LIKE \?/.test(normalized)) { const scene = params[index++]; const tag = params[index++]; rows = rows.filter(row => like(row.scene, scene) || like(row.tags, tag)) }
      if (/title LIKE \? OR scene LIKE \?/.test(normalized)) { const q = params[index++]; const q2 = params[index++]; rows = rows.filter(row => like(row.title, q) || like(row.scene, q2)) }
    }
    rows.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)) || b.id - a.id)
    return limit(rows, normalized.includes('LIMIT 3') ? 3 : 200)
  }
  if (normalized.includes('FROM ai_suppliers')) {
    let rows = table('ai_suppliers').map(clone)
    if (/WHERE id=\?/.test(normalized)) rows = rows.filter(row => row.id === Number(params[0]))
    else {
      let index = 0
      if (/industry=\?/.test(normalized)) { const value = params[index++]; rows = rows.filter(row => row.industry === value) }
      if (/title LIKE \? OR provider LIKE/.test(normalized)) {
        const q = params[index++]
        const q2 = params[index++]
        const q3 = /description LIKE/.test(normalized) ? params[index++] : null
        rows = rows.filter(row => like(row.title, q) || like(row.provider, q2) || (q3 != null && like(row.description, q3)))
      }
    }
    rows.sort((a, b) => b.id - a.id)
    return limit(rows, normalized.includes('LIMIT 100') ? 100 : rows.length)
  }
  if (normalized.includes('FROM ai_catalog_items')) {
    let rows = table('ai_catalog_items').map(clone)
    const hasId = /id=\?/.test(normalized)
    let index = hasId ? 1 : 0
    if (hasId) rows = rows.filter(row => row.id === Number(params[0]))
    const categoryMatch = normalized.match(/category IN \(([^)]+)\)/)
    if (categoryMatch) {
      const tokens = categoryMatch[1].split(',').map(value => value.trim())
      const values = tokens.every(value => value === '?')
        ? params.slice(index, index + tokens.length)
        : tokens.map(value => value.replace(/^['"]|['"]$/g, ''))
      if (tokens.every(value => value === '?')) index += tokens.length
      rows = rows.filter(row => values.includes(row.category))
    } else if (/category\s*=\s*\?/.test(normalized)) {
      const value = params[index++]
      rows = rows.filter(row => row.category === value)
    }
    const literalCategory = normalized.match(/category\s*=\s*'([^']+)'/)
    if (literalCategory) rows = rows.filter(row => row.category === literalCategory[1])
    if (/subtype=\?/.test(normalized)) { const value = params[index++]; rows = rows.filter(row => row.subtype === value) }
    const literalStatus = normalized.match(/status\s*=\s*'([^']+)'/)
    if (literalStatus) rows = rows.filter(row => row.status === literalStatus[1])
    if (/title LIKE \? OR summary LIKE \?/.test(normalized)) { const q = params[index++]; const q2 = params[index++]; rows = rows.filter(row => like(row.title, q) || like(row.summary, q2)) }
    rows.sort((a, b) => b.id - a.id)
    return limit(rows, normalized.includes('LIMIT 5') ? 5 : 200)
  }
  if (normalized.includes('FROM ai_metrics')) {
    const keys = normalized.includes('IN (') ? ['compute', 'institutions', 'published_demands', 'matching'] : ['companies', 'output', 'projects', 'algorithms']
    return table('ai_metrics').filter(row => keys.includes(row.metric_key)).map(clone)
  }
  if (normalized.includes('FROM ai_attachments')) {
    let rows = table('ai_attachments').filter(row => row.id === Number(params[0]))
    if (/created_by=\?/.test(normalized)) rows = rows.filter(row => row.created_by === Number(params[1]))
    return rows.map(clone)
  }
  if (normalized.includes('FROM ai_application_events')) return table('ai_application_events').filter(row => row.application_id === Number(params[0])).sort((a, b) => a.id - b.id).map(clone)
  if (normalized.includes('FROM ai_applications')) {
    let rows = table('ai_applications').map(clone)
    if (/WHERE id=\?/.test(normalized)) rows = rows.filter(row => row.id === Number(params[0]) && (!/created_by=\?/.test(normalized) || row.created_by === Number(params[1])))
    else {
      let index = 0
      if (/created_by=\?/.test(normalized)) { const value = Number(params[index++]); rows = rows.filter(row => row.created_by === value) }
      if (/status=\?/.test(normalized)) { const value = params[index++]; rows = rows.filter(row => row.status === value) }
      if (/target_type=\?/.test(normalized)) { const type = params[index++]; const target = Number(params[index++]); rows = rows.filter(row => row.target_type === type); rows = rows.filter(row => row.target_id === target) }
      if (/title LIKE \? OR a\.application_no LIKE \? OR a\.company LIKE/.test(normalized)) { const q = params[index++]; const q2 = params[index++]; const q3 = params[index++]; rows = rows.filter(row => like(row.title, q) || like(row.application_no, q2) || like(row.company, q3)) }
    }
    if (/GROUP BY status/.test(normalized)) {
      const grouped = {}
      rows.forEach(row => { grouped[row.status] = (grouped[row.status] || 0) + 1 })
      return Object.entries(grouped).map(([status, total]) => ({ status, total }))
    }
    rows.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)) || b.id - a.id)
    return limit(rows, 200)
  }
  return []
}

async function get(sql, params = []) {
  const rows = selectRows(sql, params)
  return rows[0] || null
}

async function all(sql, params = []) {
  const rows = selectRows(sql, params)
  if (sql.includes('SELECT id,title,application_type AS subtype')) return rows.map(row => ({ id: row.id, title: row.title, subtype: row.application_type, summary: row.status }))
  if (sql.includes('SELECT id,title,industry AS subtype')) return rows.map(row => ({ id: row.id, title: row.title, subtype: row.industry, summary: row.description }))
  if (sql.includes('SELECT id,title,provider AS subtype')) return rows.map(row => ({ id: row.id, title: row.title, subtype: row.provider, summary: row.description }))
  return rows
}

async function run(sql, params = []) {
  const normalized = sql.replace(/\s+/g, ' ').trim()
  if (normalized.startsWith('INSERT') && normalized.includes('ai_users')) {
    const existing = table('ai_users').find(row => row.username === params[0])
    return { insertId: existing?.id || add('ai_users', { username: params[0], password: params[1], display_name: params[2], company: params[3], role: params[4], status: 1 }).id, affectedRows: existing ? 0 : 1 }
  }
  if (normalized.startsWith('INSERT') && normalized.includes('ai_tokens')) return { insertId: add('ai_tokens', { token_hash: params[0], user_id: params[1], expires_at: new Date(Date.now() + 86400000).toISOString().slice(0, 19).replace('T', ' '), created_by: params[2] }).id, affectedRows: 1 }
  if (normalized.startsWith('DELETE FROM ai_tokens')) { const before = table('ai_tokens').length; state.ai_tokens = table('ai_tokens').filter(row => row.token_hash !== params[0]); return { insertId: 0, affectedRows: before - state.ai_tokens.length } }
  if (normalized.startsWith('INSERT') && normalized.includes('ai_attachments')) return { insertId: add('ai_attachments', { original_name: params[0], stored_name: params[1], mime_type: params[2], size_bytes: params[3], created_by: params[4] }).id, affectedRows: 1 }
  if (normalized.startsWith('INSERT') && normalized.includes('ai_demands')) {
    const seeded = normalized.includes('deadline') && normalized.includes('seed_record')
    return {
      insertId: add('ai_demands', {
        title: params[0], demand_type: params[1], industry: params[2], scene: params[3], description: params[4], tags: params[5],
        budget_min: params[6], budget_max: params[7], period_months: params[8], region: params[9], deadline: seeded ? params[10] : null,
        company: seeded ? params[11] : params[10], contact: seeded ? params[12] : params[11], phone: seeded ? params[13] : params[12],
        status: '已发布', seed_record: seeded ? 1 : 0, created_by: seeded ? params[14] : params[13]
      }).id,
      affectedRows: 1
    }
  }
  if (normalized.startsWith('INSERT') && normalized.includes('ai_suppliers')) return { insertId: add('ai_suppliers', { title: params[0], provider: params[1], industry: params[2], description: params[3], tags: params[4], budget_min: params[5], budget_max: params[6], period_months: params[7], seed_record: 1 }).id, affectedRows: 1 }
  if (normalized.startsWith('INSERT') && normalized.includes('ai_catalog_items')) return { insertId: add('ai_catalog_items', { category: params[0], title: params[1], subtype: params[2], summary: params[3], body: params[4], provider: params[5], industry: params[6], deadline: params[7], status: params[8], metadata: params[9], seed_record: 1 }).id, affectedRows: 1 }
  if (normalized.startsWith('INSERT') && normalized.includes('ai_metrics')) { const existing = table('ai_metrics').find(row => row.metric_key === params[0]); return { insertId: existing?.id || add('ai_metrics', { metric_key: params[0], label: params[1], value: params[2], unit: params[3], note: params[4], kind: params[5] }).id, affectedRows: existing ? 0 : 1 } }
  if (normalized.startsWith('INSERT') && normalized.includes('ai_applications')) {
    const seeded = normalized.includes('return_reason') && normalized.includes('seed_record')
    const row = seeded
      ? { application_type: params[0], target_type: params[1], target_id: null, demand_id: params[2], supplier_id: params[3], title: params[4], company: params[5], contact: params[6], phone: params[7], description: params[8], service_type: params[9], environment_id: null, attachment_name: '', attachment_path: '', attachment_id: null, status: params[10], return_reason: params[11] || '', handler_id: null, seed_record: 1, created_by: params[12] }
      : { application_type: params[0], target_type: params[1], target_id: params[2], demand_id: params[3], supplier_id: params[4], title: params[5], company: params[6], contact: params[7], phone: params[8], description: params[9], service_type: params[10], environment_id: params[11], attachment_name: params[12], attachment_path: params[13], attachment_id: params[14], status: '待受理', return_reason: '', handler_id: null, seed_record: 0, created_by: params[15] }
    return { insertId: add('ai_applications', row).id, affectedRows: 1 }
  }
  if (normalized.startsWith('INSERT') && normalized.includes('ai_application_events')) return { insertId: add('ai_application_events', { application_id: params[0], from_status: params[1], to_status: params[2], actor_id: params[3], actor_name: params[4], note: params[5], created_by: params[6] }).id, affectedRows: 1 }
  if (normalized.startsWith('UPDATE ai_demands')) { const row = findById('ai_demands', params[1]); if (row) { row.demand_no = params[0]; row.updated_at = now() }; return { insertId: 0, affectedRows: row ? 1 : 0 } }
  if (normalized.startsWith('UPDATE ai_applications SET application_no')) { const row = findById('ai_applications', params[1]); if (row) { row.application_no = params[0]; row.updated_at = now() }; return { insertId: 0, affectedRows: row ? 1 : 0 } }
  if (normalized.startsWith('UPDATE ai_applications SET status=') && normalized.includes('description=?')) { const row = findById('ai_applications', params[1]); if (row) { row.status = '待受理'; row.description = params[0]; row.return_reason = ''; row.updated_at = now() }; return { insertId: 0, affectedRows: row ? 1 : 0 } }
  if (normalized.startsWith('UPDATE ai_applications SET status=')) { const row = findById('ai_applications', params[3]); if (row) { row.status = params[0]; row.return_reason = params[1]; row.handler_id = params[2]; row.updated_at = now() }; return { insertId: 0, affectedRows: row ? 1 : 0 } }
  if (normalized.startsWith('DELETE FROM')) {
    const name = normalized.match(/^DELETE FROM (\w+)/)?.[1]
    if (name && state[name]) {
      const before = state[name].length
      if (/WHERE token_hash=\?/.test(normalized)) state[name] = state[name].filter(row => row.token_hash !== params[0])
      else if (/WHERE application_id=\?/.test(normalized)) state[name] = state[name].filter(row => row.application_id !== Number(params[0]))
      else if (/WHERE id=\?/.test(normalized)) state[name] = state[name].filter(row => row.id !== Number(params[0]))
      else state[name] = []
      return { insertId: 0, affectedRows: before - state[name].length }
    }
  }
  return { insertId: 0, affectedRows: 0 }
}

const aiMockDb = {
  // Keep the _demo suffix so existing safety checks and reset tooling remain valid.
  database: 'jian_ai_mock_demo',
  pool: { async end() {} },
  get,
  all,
  run,
  async transaction(fn) {
    const stateSnapshot = clone(state)
    const counterSnapshot = { ...counters }
    try {
      return await fn(aiMockDb)
    } catch (error) {
      for (const name of tables) state[name] = stateSnapshot[name]
      for (const name of tables) counters[name] = counterSnapshot[name]
      throw error
    }
  }
}

module.exports = { aiMockDb, state, counters, add, clone }
