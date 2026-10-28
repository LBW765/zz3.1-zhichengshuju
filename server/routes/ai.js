const express = require('express')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const multer = require('multer')
const { aiDb } = require('../db/ai')
const { parseTags, matchSuppliers } = require('../services/aiMatching')

const router = express.Router()
const ok = (res, data, message = '') => res.json({ code: 200, message, data })
const fail = (res, code, message) => res.json({ code, message, data: null })
const clean = value => typeof value === 'string' ? value.trim() : ''
const numberOrNull = value => value === '' || value == null ? null : Number(value)
const hashToken = token => crypto.createHash('sha256').update(token).digest('hex')
const publicDemand = row => {
  if (!row) return null
  const { contact, phone, ...rest } = row
  return { ...rest, tags: parseTags(row.tags) }
}
const publicCatalog = row => row && ({ ...row, metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata || '{}') : row.metadata || {} })
const uploadDir = path.join(__dirname, '..', 'uploads', 'ai-demo')
fs.mkdirSync(uploadDir, { recursive: true })
const upload = multer({
  storage: multer.diskStorage({ destination: uploadDir, filename: (_req, _file, done) => done(null, crypto.randomBytes(16).toString('hex')) }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, done) => done(null, ['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.mimetype))
})

async function optionalAuth(req, _res, next) {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1]
  if (token) {
    const row = await aiDb.get('SELECT u.id,u.username,u.display_name,u.company,u.role,u.status FROM ai_tokens t JOIN ai_users u ON u.id=t.user_id WHERE t.token_hash=? AND t.expires_at>NOW()', [hashToken(token)])
    if (row?.status) req.aiUser = row
  }
  next()
}
router.use(optionalAuth)
const requireAuth = (req, res, next) => req.aiUser ? next() : fail(res, 401, '请先登录演示工作台')
const requireRole = (...roles) => (req, res, next) => roles.includes(req.aiUser?.role) ? next() : fail(res, 403, '当前身份无权执行此操作')

router.post('/login', async (req, res) => {
  const username = clean(req.body?.username)
  const password = String(req.body?.password || '')
  const user = await aiDb.get('SELECT * FROM ai_users WHERE username=?', [username])
  if (!user || !user.status || !bcrypt.compareSync(password, user.password)) return fail(res, 401, '用户名或密码错误')
  const token = crypto.randomBytes(32).toString('hex')
  await aiDb.run('INSERT INTO ai_tokens (token_hash,user_id,expires_at,created_by) VALUES (?,?,DATE_ADD(NOW(), INTERVAL 24 HOUR),?)', [hashToken(token), user.id, user.id])
  ok(res, { token, user: { id: user.id, username, displayName: user.display_name, company: user.company, role: user.role } }, '登录成功')
})
router.get('/me', requireAuth, (req, res) => ok(res, req.aiUser))
router.post('/logout', requireAuth, async (req, res) => {
  const token = req.headers.authorization.slice(7)
  await aiDb.run('DELETE FROM ai_tokens WHERE token_hash=?', [hashToken(token)])
  ok(res, {})
})
router.post('/uploads', requireAuth, requireRole('enterprise'), upload.single('file'), async (req, res) => {
  if (!req.file) return fail(res, 400, '仅支持 PDF、PNG、JPG 或 DOCX，且不超过 10 MB')
  const name = path.basename(req.file.originalname).slice(0, 160)
  const inserted = await aiDb.run('INSERT INTO ai_attachments (original_name,stored_name,mime_type,size_bytes,created_by) VALUES (?,?,?,?,?)', [name, req.file.filename, req.file.mimetype, req.file.size, req.aiUser.id])
  ok(res, { id: inserted.insertId, name })
})
router.get('/uploads/:id', requireAuth, async (req, res) => {
  const file = await aiDb.get('SELECT * FROM ai_attachments WHERE id=?', [Number(req.params.id)])
  if (!file) return fail(res, 404, '附件不存在')
  if (req.aiUser.role === 'enterprise' && file.created_by !== req.aiUser.id) return fail(res, 403, '无权查看此附件')
  if (req.aiUser.role === 'government') {
    const linked = await aiDb.get('SELECT id FROM ai_applications WHERE attachment_id=?', [file.id])
    if (!linked) return fail(res, 403, '无权查看此附件')
  }
  res.download(path.join(uploadDir, file.stored_name), file.original_name)
})

router.get('/portal', async (_req, res) => {
  const [metrics, demands, news] = await Promise.all([
    aiDb.all("SELECT metric_key,label,value,unit,note,kind FROM ai_metrics WHERE metric_key IN ('compute','institutions','published_demands','matching') ORDER BY id"),
    aiDb.all('SELECT id,demand_no,title,industry,scene,description,region,deadline,budget_min,budget_max,status,company FROM ai_demands ORDER BY created_at DESC LIMIT 3'),
    aiDb.all("SELECT id,category,title,subtype,summary,created_at FROM ai_catalog_items WHERE category IN ('policy','news') ORDER BY id DESC LIMIT 5")
  ])
  ok(res, { metrics, demands, news, dataLabel: '演示数据' })
})

router.get('/search', async (req, res) => {
  const keyword = clean(req.query.q).slice(0, 100)
  const pattern = `%${keyword}%`
  const type = clean(req.query.type)
  const results = []
  if (type === 'application') {
    if (!req.aiUser) return fail(res, 401, '登录后才可查询本人办理进度')
    const rows = await aiDb.all('SELECT id,title,application_type AS subtype,status AS summary FROM ai_applications WHERE created_by=? AND (title LIKE ? OR application_no LIKE ?) ORDER BY id DESC LIMIT 50', [req.aiUser.id, pattern, pattern])
    return ok(res, { items: rows.map(row => ({ ...row, category: 'application' })), total: rows.length, dataLabel: '演示环境' })
  }
  if (!type || type === 'demand') {
    const rows = await aiDb.all('SELECT id,title,industry AS subtype,description AS summary FROM ai_demands WHERE title LIKE ? OR description LIKE ? ORDER BY id DESC LIMIT 50', [pattern, pattern])
    results.push(...rows.map(row => ({ ...row, category: 'demand' })))
  }
  if (!type || type === 'supplier') {
    const rows = await aiDb.all('SELECT id,title,provider AS subtype,description AS summary FROM ai_suppliers WHERE title LIKE ? OR provider LIKE ? OR description LIKE ? ORDER BY id DESC LIMIT 50', [pattern, pattern, pattern])
    results.push(...rows.map(row => ({ ...row, category: 'supplier' })))
  }
  if (!type || !['demand', 'supplier'].includes(type)) {
    const categories = type ? [type] : ['model', 'data', 'compute', 'agent', 'policy', 'news', 'event', 'task']
    if (categories.length) {
      const marks = categories.map(() => '?').join(',')
      const rows = await aiDb.all(`SELECT id,category,title,subtype,summary FROM ai_catalog_items WHERE category IN (${marks}) AND (title LIKE ? OR summary LIKE ?) ORDER BY id DESC LIMIT 100`, [...categories, pattern, pattern])
      results.push(...rows)
    }
  }
  ok(res, { items: results, total: results.length, dataLabel: '演示数据' })
})

router.get('/catalog', async (req, res) => {
  const category = clean(req.query.category)
  const keyword = clean(req.query.q).slice(0, 100)
  const subtype = clean(req.query.subtype)
  const params = []
  let sql = 'SELECT * FROM ai_catalog_items WHERE 1=1'
  if (category) { sql += ' AND category=?'; params.push(category) }
  if (subtype) { sql += ' AND subtype=?'; params.push(subtype) }
  if (keyword) { sql += ' AND (title LIKE ? OR summary LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`) }
  const rows = await aiDb.all(`${sql} ORDER BY id DESC LIMIT 200`, params)
  ok(res, { items: rows.map(publicCatalog), total: rows.length })
})
router.get('/catalog/:id', async (req, res) => {
  const row = await aiDb.get('SELECT * FROM ai_catalog_items WHERE id=?', [Number(req.params.id)])
  return row ? ok(res, publicCatalog(row)) : fail(res, 404, '资源不存在')
})
router.get('/suppliers', async (req, res) => {
  const industry = clean(req.query.industry)
  const keyword = clean(req.query.q).slice(0, 100)
  const params = []
  let sql = 'SELECT * FROM ai_suppliers WHERE 1=1'
  if (industry) { sql += ' AND industry=?'; params.push(industry) }
  if (keyword) { sql += ' AND (title LIKE ? OR provider LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`) }
  const rows = await aiDb.all(`${sql} ORDER BY id DESC LIMIT 100`, params)
  ok(res, { items: rows.map(row => ({ ...row, tags: parseTags(row.tags), provider: `${row.provider}（方案示例）` })), total: rows.length })
})
router.get('/suppliers/:id', async (req, res) => {
  const row = await aiDb.get('SELECT * FROM ai_suppliers WHERE id=?', [Number(req.params.id)])
  return row ? ok(res, { ...row, tags: parseTags(row.tags), provider: `${row.provider}（方案示例）` }) : fail(res, 404, '供给方案不存在')
})
router.post('/recommend', async (req, res) => {
  const industry = clean(req.body?.industry)
  const scene = clean(req.body?.scene)
  const period = Number(req.body?.periodMonths)
  const budgetMax = numberOrNull(req.body?.budgetMax)
  if (!industry || scene.length < 2 || !Number.isInteger(period) || period < 1 || period > 24 || (budgetMax != null && (!Number.isFinite(budgetMax) || budgetMax < 0))) return fail(res, 400, '请填写行业、场景、有效预算和交付周期')
  const demand = { industry, scene, description: '', tags: [], budget_min: budgetMax == null ? null : 0, budget_max: budgetMax, period_months: period }
  const suppliers = await aiDb.all('SELECT * FROM ai_suppliers WHERE industry=?', [industry])
  ok(res, { items: matchSuppliers(demand, suppliers), ruleVersion: 'v1.0' })
})

router.get('/demands', async (req, res) => {
  const industry = clean(req.query.industry)
  const keyword = clean(req.query.q).slice(0, 100)
  const status = clean(req.query.status)
  const scene = clean(req.query.scene).slice(0, 60)
  const params = []
  let sql = 'SELECT * FROM ai_demands WHERE 1=1'
  if (industry) { sql += ' AND industry=?'; params.push(industry) }
  if (status) { sql += ' AND status=?'; params.push(status) }
  if (scene) { sql += ' AND (scene LIKE ? OR CAST(tags AS CHAR) LIKE ?)'; params.push(`%${scene}%`, `%${scene}%`) }
  if (keyword) { sql += ' AND (title LIKE ? OR scene LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`) }
  const rows = await aiDb.all(`${sql} ORDER BY created_at DESC,id DESC LIMIT 200`, params)
  ok(res, { items: rows.map(publicDemand), total: rows.length })
})
router.post('/demands', requireAuth, requireRole('enterprise'), async (req, res) => {
  const body = req.body || {}
  const title = clean(body.title)
  const description = clean(body.description)
  const scene = clean(body.scene)
  const contact = clean(body.contact)
  const phone = clean(body.phone)
  const industry = clean(body.industry)
  const demandType = clean(body.demandType)
  const period = Number(body.periodMonths)
  const min = numberOrNull(body.budgetMin)
  const max = numberOrNull(body.budgetMax)
  if (title.length < 5 || title.length > 100) return fail(res, 400, '需求名称需为 5-100 字')
  if (!['AI 转型', '技术攻关', '资源申请', '其他'].includes(demandType)) return fail(res, 400, '请选择需求类型')
  if (!['电子信息制造', '现代农业', '文旅服务', '政务治理'].includes(industry)) return fail(res, 400, '请选择所属行业')
  if (scene.length < 10 || description.length < 20 || description.length > 2000) return fail(res, 400, '场景至少 10 字，描述需为 20-2000 字')
  if (!Number.isInteger(period) || period < 1 || period > 24) return fail(res, 400, '交付周期需为 1-24 个月')
  if ((min == null) !== (max == null) || (min != null && (!Number.isFinite(min) || min < 0)) || (max != null && (!Number.isFinite(max) || max < 0)) || (min != null && max != null && min > max)) return fail(res, 400, '预算范围需同时填写且最低值不能超过最高值')
  if (!contact || !/^1\d{10}$/.test(phone)) return fail(res, 400, '请填写联系人和有效手机号')
  const tags = parseTags(body.tags).slice(0, 10)
  const result = await aiDb.run('INSERT INTO ai_demands (title,demand_type,industry,scene,description,tags,budget_min,budget_max,period_months,region,company,contact,phone,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [title, demandType, industry, scene, description, JSON.stringify(tags), min, max, period, clean(body.region) || '吉安市', req.aiUser.company, contact, phone, req.aiUser.id])
  const demandNo = `JA-${new Date().getFullYear()}-${String(result.insertId).padStart(6, '0')}`
  await aiDb.run('UPDATE ai_demands SET demand_no=? WHERE id=?', [demandNo, result.insertId])
  ok(res, { id: result.insertId, demandNo }, '需求发布成功')
})
router.get('/demands/:id', async (req, res) => {
  const row = await aiDb.get('SELECT * FROM ai_demands WHERE id=?', [Number(req.params.id)])
  if (!row) return fail(res, 404, '需求不存在')
  const result = publicDemand(row)
  if (req.aiUser && (req.aiUser.id === row.created_by || req.aiUser.role === 'operations')) {
    result.contact = row.contact
    result.phone = row.phone
  }
  ok(res, result)
})
router.get('/demands/:id/matches', requireAuth, requireRole('enterprise', 'operations'), async (req, res) => {
  const row = await aiDb.get('SELECT * FROM ai_demands WHERE id=?', [Number(req.params.id)])
  if (!row) return fail(res, 404, '需求不存在')
  if (req.aiUser.role === 'enterprise' && row.created_by !== req.aiUser.id) return fail(res, 403, '只能查看自己的需求匹配结果')
  const suppliers = await aiDb.all('SELECT * FROM ai_suppliers ORDER BY id')
  ok(res, { demand: publicDemand(row), items: matchSuppliers(row, suppliers), ruleVersion: 'v1.0', weights: { industry: 35, scene: 35, budget: 20, period: 10 } })
})

function visibleApplications(user) {
  return user.role === 'enterprise' ? { sql: ' WHERE a.created_by=?', params: [user.id] } : { sql: '', params: [] }
}
const listApplications = async (req, res) => {
  const visible = visibleApplications(req.aiUser)
  const status = clean(req.query.status)
  const keyword = clean(req.query.q).slice(0, 100)
  let sql = `SELECT a.id,a.application_no,a.application_type,a.target_type,a.target_id,a.demand_id,a.supplier_id,a.title,a.company,a.description,a.service_type,a.environment_id,a.status,a.return_reason,a.handler_id,a.seed_record,a.created_by,a.created_at,a.updated_at FROM ai_applications a${visible.sql}`
  const params = [...visible.params]
  sql += visible.sql ? ' AND 1=1' : ' WHERE 1=1'
  if (status) { sql += ' AND a.status=?'; params.push(status) }
  if (keyword) { sql += ' AND (a.title LIKE ? OR a.application_no LIKE ? OR a.company LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`) }
  const rows = await aiDb.all(`${sql} ORDER BY a.updated_at DESC,a.id DESC LIMIT 200`, params)
  ok(res, { items: rows, total: rows.length })
}
router.get('/applications', requireAuth, listApplications)
router.get('/operations/applications', requireAuth, requireRole('operations'), listApplications)
router.get('/applications/:id', requireAuth, async (req, res) => {
  const row = await aiDb.get('SELECT * FROM ai_applications WHERE id=?', [Number(req.params.id)])
  if (!row) return fail(res, 404, '申请不存在')
  if (req.aiUser.role === 'enterprise' && row.created_by !== req.aiUser.id) return fail(res, 403, '只能查看自己的申请')
  const events = await aiDb.all('SELECT id,from_status,to_status,actor_name,note,created_at FROM ai_application_events WHERE application_id=? ORDER BY id', [row.id])
  const detail = { ...row, events }
  delete detail.attachment_path
  if (req.aiUser.role === 'government') { delete detail.contact; delete detail.phone; delete detail.attachment_path }
  ok(res, detail)
})
router.post('/applications', requireAuth, requireRole('enterprise'), async (req, res) => {
  const body = req.body || {}
  const targetType = clean(body.targetType)
  const allowed = ['pilot', 'resource', 'event', 'task', 'qualification', 'alliance']
  if (!allowed.includes(targetType)) return fail(res, 400, '申请类型无效')
  const targetId = Number(body.targetId)
  let target = null
  if (targetType === 'pilot') {
    target = await aiDb.get("SELECT id,title,'pilot' category,status FROM ai_catalog_items WHERE id=? AND category='pilot'", [targetId])
  } else if (targetType === 'resource') {
    target = await aiDb.get("SELECT id,title,category,status,deadline FROM ai_catalog_items WHERE id=? AND category IN ('compute','model','data','agent')", [targetId])
  } else {
    target = await aiDb.get('SELECT id,title,category,status,deadline FROM ai_catalog_items WHERE id=? AND category=?', [targetId, targetType])
  }
  if (!target) return fail(res, 404, '申请目标不存在')
  const openStatuses = { pilot: ['可申请'], resource: ['可申请', '授权申请'], event: ['报名中'], task: ['征集中'], qualification: ['可申请'], alliance: ['开放申请'] }
  if (!openStatuses[targetType].includes(target.status)) return fail(res, 400, '该项目暂未开放申请')
  if (target.deadline && new Date(target.deadline) < new Date(new Date().toDateString())) return fail(res, 400, '该项目已截止')
  const contact = clean(body.contact)
  const phone = clean(body.phone)
  const description = clean(body.description)
  if (!contact || !/^1\d{10}$/.test(phone) || description.length < 10) return fail(res, 400, '请填写联系人、有效手机号和至少 10 字申请说明')
  let demandId = null
  let supplierId = null
  if (targetType === 'pilot') {
    demandId = Number(body.demandId)
    supplierId = Number(body.supplierId)
    const demand = await aiDb.get('SELECT id FROM ai_demands WHERE id=? AND created_by=?', [demandId, req.aiUser.id])
    const supplier = await aiDb.get('SELECT * FROM ai_suppliers WHERE id=?', [supplierId])
    if (!demand || !supplier || !['模型效果验证', '安全合规评测', '场景适配调试'].includes(clean(body.serviceType))) return fail(res, 400, '请选择自己的需求、供给方案和中试服务类型')
    const demandForMatch = await aiDb.get('SELECT * FROM ai_demands WHERE id=?', [demandId])
    if (supplier.industry !== demandForMatch.industry) return fail(res, 400, '供给方案与需求行业不匹配')
    if (body.environmentId != null) {
      const environment = await aiDb.get("SELECT id FROM ai_catalog_items WHERE id=? AND category='environment' AND status='可预约'", [Number(body.environmentId)])
      if (!environment) return fail(res, 400, '测试环境不可预约')
    }
  }
  if (['event', 'task', 'alliance'].includes(targetType)) {
    const existing = await aiDb.get('SELECT id FROM ai_applications WHERE created_by=? AND target_type=? AND target_id=? LIMIT 1', [req.aiUser.id, targetType, targetId])
    if (existing) return fail(res, 409, '已提交过该项目申请')
  }
  const title = `${target.title}申请`
  let attachment = null
  if (body.attachmentId != null) {
    attachment = await aiDb.get('SELECT id,original_name,stored_name FROM ai_attachments WHERE id=? AND created_by=?', [Number(body.attachmentId), req.aiUser.id])
    if (!attachment) return fail(res, 400, '附件不存在或不属于当前用户')
  }
  const typeLabel = { pilot: '中试验证', resource: 'AI 资源', event: '赛事报名', task: '揭榜申报', qualification: '资质评测', alliance: '联盟入会' }[targetType]
  const result = await aiDb.transaction(async tx => {
    const inserted = await tx.run('INSERT INTO ai_applications (application_type,target_type,target_id,demand_id,supplier_id,title,company,contact,phone,description,service_type,environment_id,attachment_name,attachment_path,attachment_id,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [typeLabel, targetType, targetId, demandId, supplierId, title, req.aiUser.company, contact, phone, description, clean(body.serviceType), numberOrNull(body.environmentId), attachment?.original_name || '', attachment?.stored_name || '', attachment?.id || null, req.aiUser.id])
    const applicationNo = `AP-${new Date().getFullYear()}-${String(inserted.insertId).padStart(6, '0')}`
    await tx.run('UPDATE ai_applications SET application_no=? WHERE id=?', [applicationNo, inserted.insertId])
    await tx.run('INSERT INTO ai_application_events (application_id,from_status,to_status,actor_id,actor_name,note,created_by) VALUES (?,?,?,?,?,?,?)', [inserted.insertId, '', '待受理', req.aiUser.id, req.aiUser.display_name, '提交申请', req.aiUser.id])
    return { id: inserted.insertId, applicationNo }
  })
  ok(res, result, '申请提交成功')
})
router.patch('/applications/:id/resubmit', requireAuth, requireRole('enterprise'), async (req, res) => {
  const id = Number(req.params.id)
  const note = clean(req.body?.description)
  if (note.length < 10) return fail(res, 400, '补充说明至少 10 字')
  const changed = await aiDb.transaction(async tx => {
    const row = await tx.get('SELECT id,status FROM ai_applications WHERE id=? AND created_by=? FOR UPDATE', [id, req.aiUser.id])
    if (!row || row.status !== '已退回') return false
    await tx.run("UPDATE ai_applications SET status='待受理',description=?,return_reason='',updated_at=NOW() WHERE id=?", [note, id])
    await tx.run('INSERT INTO ai_application_events (application_id,from_status,to_status,actor_id,actor_name,note,created_by) VALUES (?,?,?,?,?,?,?)', [id, '已退回', '待受理', req.aiUser.id, req.aiUser.display_name, '补充材料后重新提交', req.aiUser.id])
    return true
  })
  return changed ? ok(res, { id }, '重新提交成功') : fail(res, 409, '申请状态已变化，请刷新后重试')
})

router.patch('/operations/applications/:id/status', requireAuth, requireRole('operations'), async (req, res) => {
  const id = Number(req.params.id)
  const nextStatus = clean(req.body?.status)
  const note = clean(req.body?.note)
  const transitions = { 待受理: ['已受理', '已退回'], 已受理: ['处理中', '已退回'], 处理中: ['已完成', '已退回'] }
  if (!['已受理', '处理中', '已完成', '已退回'].includes(nextStatus)) return fail(res, 400, '目标状态无效')
  if (nextStatus === '已退回' && !note) return fail(res, 400, '退回时必须填写原因')
  const changed = await aiDb.transaction(async tx => {
    const row = await tx.get('SELECT id,status FROM ai_applications WHERE id=? FOR UPDATE', [id])
    if (!row || !transitions[row.status]?.includes(nextStatus)) return false
    await tx.run('UPDATE ai_applications SET status=?,return_reason=?,handler_id=?,updated_at=NOW() WHERE id=?', [nextStatus, nextStatus === '已退回' ? note : '', req.aiUser.id, id])
    await tx.run('INSERT INTO ai_application_events (application_id,from_status,to_status,actor_id,actor_name,note,created_by) VALUES (?,?,?,?,?,?,?)', [id, row.status, nextStatus, req.aiUser.id, req.aiUser.display_name, note, req.aiUser.id])
    return true
  })
  return changed ? ok(res, { id, status: nextStatus }, '状态更新成功') : fail(res, 409, '申请状态已变化，请刷新后重试')
})

router.get('/government/overview', requireAuth, requireRole('government'), async (_req, res) => {
  const [metrics, summary, news] = await Promise.all([
    aiDb.all("SELECT metric_key,label,value,unit,note,kind,updated_at FROM ai_metrics WHERE metric_key IN ('companies','output','projects','algorithms') ORDER BY id"),
    aiDb.all('SELECT status,COUNT(*) total FROM ai_applications GROUP BY status'),
    aiDb.all("SELECT id,category,title,subtype,created_at FROM ai_catalog_items WHERE category IN ('policy','news') ORDER BY id DESC LIMIT 5")
  ])
  ok(res, { metrics, summary, news, trend: [68, 72, 75, 78, 81, 84, 88, 93, 99, 107, 118, 128.5], distribution: [32, 18, 12, 10, 9, 11, 8], dataLabel: '演示数据' })
})
router.get('/government/projects', requireAuth, requireRole('government'), async (req, res) => {
  const status = clean(req.query.status)
  const type = clean(req.query.type)
  const industry = clean(req.query.industry)
  const from = clean(req.query.from)
  const to = clean(req.query.to)
  const keyword = clean(req.query.q).slice(0, 100)
  const params = []
  let sql = 'SELECT a.id,a.application_no,a.title,a.application_type,a.company,a.status,a.demand_id,a.supplier_id,a.created_at,a.updated_at,d.demand_no,d.industry FROM ai_applications a LEFT JOIN ai_demands d ON d.id=a.demand_id WHERE 1=1'
  if (status) { sql += ' AND a.status=?'; params.push(status) }
  if (type) { sql += ' AND a.application_type=?'; params.push(type) }
  if (industry) { sql += ' AND d.industry=?'; params.push(industry) }
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) { sql += ' AND DATE(a.created_at)>=?'; params.push(from) }
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) { sql += ' AND DATE(a.created_at)<=?'; params.push(to) }
  if (keyword) { sql += ' AND (a.title LIKE ? OR a.application_no LIKE ? OR a.company LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`) }
  const rows = await aiDb.all(`${sql} ORDER BY a.updated_at DESC,a.id DESC LIMIT 200`, params)
  ok(res, { items: rows, total: rows.length })
})

router.use((error, _req, res, next) => {
  if (error instanceof multer.MulterError) return fail(res, 400, error.code === 'LIMIT_FILE_SIZE' ? '附件不能超过 10 MB' : '附件上传失败')
  next(error)
})

module.exports = router
