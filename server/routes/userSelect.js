/**
 * 用户选择器接口(轻量、不带角色限制)
 *
 * 用途:任何登录用户都可以拉用户列表用于「成员选择」「负责人选择」等下拉,
 * 不受 /system/users(管理员专属)的限制。
 *
 * GET /user-select        - 用户列表(分页 + keyword 模糊),返回 id/username/nickName/deptName/status
 * GET /user-select/:ids   - 按 id 列表批量回显(逗号分隔的 id 串)
 */
const express = require('express')
const { db } = require('../db/index')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()
router.use(authMiddleware)

router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize) || 30))
  const offset = (page - 1) * pageSize
  const keyword = (req.query.keyword || '').trim()
  const onlyEnabled = req.query.onlyEnabled === '0' ? false : true

  const where = []
  const params = []
  if (keyword) {
    where.push('(u.username LIKE ? OR u.nick_name LIKE ? OR u.phone LIKE ? OR u.email LIKE ?)')
    const like = `%${keyword}%`
    params.push(like, like, like, like)
  }
  if (onlyEnabled) {
    where.push('u.status = 1')
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  try {
    const total = (await db.get(`SELECT COUNT(*) AS c FROM users u ${whereSql}`, params)).c
    const rows = await db.all(`
      SELECT u.id, u.username, u.nick_name, u.phone, u.email,
             u.dept_id, u.dept_name, d.dept_name AS dept_name_live,
             u.account_type, u.status
      FROM users u
      LEFT JOIN departments d ON d.id = u.dept_id
      ${whereSql}
      ORDER BY u.id ASC
      LIMIT ? OFFSET ?
    `, [...params, pageSize, offset])

    const list = rows.map(r => ({
      id: r.id,
      username: r.username,
      nickName: r.nick_name || '',
      phone: r.phone || '',
      email: r.email || '',
      deptId: r.dept_id || null,
      deptName: r.dept_name_live || r.dept_name || '',
      accountType: r.account_type || 'internal',
      status: r.status
    }))
    res.json({ code: 200, data: { list, total, page, pageSize } })
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message })
  }
})

router.get('/by-ids', async (req, res) => {
  const ids = String(req.query.ids || '').split(',').map(x => Number(x)).filter(Boolean)
  if (!ids.length) return res.json({ code: 200, data: [] })
  const placeholders = ids.map(() => '?').join(',')
  const rows = await db.all(`
    SELECT u.id, u.username, u.nick_name, u.dept_name, d.dept_name AS dept_name_live
    FROM users u
    LEFT JOIN departments d ON d.id = u.dept_id
    WHERE u.id IN (${placeholders})
  `, ids)
  res.json({
    code: 200,
    data: rows.map(r => ({
      id: r.id,
      username: r.username,
      nickName: r.nick_name || '',
      deptName: r.dept_name_live || r.dept_name || ''
    }))
  })
})

module.exports = router
