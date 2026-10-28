const express = require('express')
const bcrypt = require('bcryptjs')
const { db } = require('../db/index')
const { getUserById, dbUserToApiUser } = require('../db/helpers')
const { authMiddleware, roleMiddleware } = require('../middleware/auth')

const router = express.Router()

router.use(authMiddleware)
router.use(roleMiddleware('administrator', 'admin'))

async function resolveDepartment(deptId, deptName) {
  if (deptId) {
    const department = await db.get('SELECT id, dept_name FROM departments WHERE id = ?', [Number(deptId)])
    if (!department) return { error: '所选部门不存在' }
    return { deptId: department.id, deptName: department.dept_name || '' }
  }
  return { deptId: null, deptName: String(deptName || '').trim() }
}

async function resolveRoleName(roles, roleName) {
  if (Array.isArray(roles) && roles.length) {
    const placeholders = roles.map(() => '?').join(',')
    const rows = await db.all(`SELECT role_key, role_name FROM roles WHERE role_key IN (${placeholders})`, roles)
    const nameMap = new Map(rows.map(row => [row.role_key, row.role_name]))
    const names = roles.map(role => nameMap.get(role)).filter(Boolean)
    if (names.length) return names.join('、')
  }
  return String(roleName || '').trim()
}

router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 10))
  const offset = (page - 1) * pageSize
  const keyword = String(req.query.keyword || '').trim()
  const status = req.query.status
  const role = String(req.query.role || '').trim()

  let conditions = ''
  const params = []

  if (keyword) {
    conditions += ' AND (username LIKE ? OR nick_name LIKE ? OR email LIKE ? OR phone LIKE ?)'
    const like = `%${keyword}%`
    params.push(like, like, like, like)
  }
  if (status !== undefined && status !== '') {
    conditions += ' AND status = ?'
    params.push(Number(status))
  }
  if (role) {
    conditions += ' AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = users.id AND role = ?)'
    params.push(role)
  }

  try {
    const total = (await db.get(`SELECT COUNT(*) AS total FROM users WHERE 1=1${conditions}`, params)).total
    const rows = await db.all(`SELECT * FROM users WHERE 1=1${conditions} ORDER BY id ASC LIMIT ? OFFSET ?`, [...params, pageSize, offset])
    const list = []
    for (const row of rows) {
      list.push(await dbUserToApiUser(await getUserById(row.id)))
    }
    res.json({ code: 200, message: '获取成功', data: { list, total, page, pageSize } })
  } catch (error) {
    console.error('获取用户列表失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

router.post('/', async (req, res) => {
  const { username, password, nickName, email, phone, deptId, deptName, roleName, status, roles } = req.body

  if (!username || !username.trim()) return res.json({ code: 400, message: '用户名不能为空' })
  if (!password || password.length < 6) return res.json({ code: 400, message: '密码不能为空且至少6个字符' })
  if (!Array.isArray(roles) || roles.length === 0) return res.json({ code: 400, message: '请至少选择一个角色' })

  const department = await resolveDepartment(deptId, deptName)
  if (department.error) return res.json({ code: 400, message: department.error })

  const existing = await db.get('SELECT id FROM users WHERE username = ?', [username.trim()])
  if (existing) return res.json({ code: 400, message: '用户名已存在' })

  try {
    const newUserId = await db.transaction(async (conn) => {
      const result = await conn.run(
        `INSERT INTO users (username, password, nick_name, email, phone, dept_id, dept_name, role_name, status, account_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'internal')`,
        [
          username.trim(),
          bcrypt.hashSync(password, 10),
          nickName || '',
          email || '',
          phone || '',
          department.deptId,
          department.deptName,
          await resolveRoleName(roles, roleName),
          status !== undefined ? status : 1
        ]
      )
      for (const role of roles) {
        await conn.run('INSERT INTO user_roles (user_id, role) VALUES (?, ?)', [result.insertId, role])
      }
      return Number(result.insertId)
    })
    res.json({ code: 200, message: '添加成功', data: { id: newUserId } })
  } catch (error) {
    console.error('添加用户失败:', error.message)
    res.json({ code: 500, message: '添加失败' })
  }
})

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT * FROM users WHERE id = ?', [id])
  if (!existing) return res.json({ code: 404, message: '用户不存在' })

  const targetUser = await getUserById(id)
  if (targetUser.roles.includes('administrator') && !req.user.roles.includes('administrator')) {
    return res.json({ code: 403, message: '无权修改超级管理员账号' })
  }

  const { nickName, email, phone, deptId, deptName, roleName, status, roles } = req.body
  const department = await resolveDepartment(
    deptId !== undefined ? deptId : existing.dept_id,
    deptName !== undefined ? deptName : existing.dept_name
  )
  if (department.error) return res.json({ code: 400, message: department.error })

  try {
    await db.transaction(async (conn) => {
      await conn.run(
        `UPDATE users
         SET nick_name=?, email=?, phone=?, dept_id=?, dept_name=?, role_name=?, status=?, account_type='internal',
             related_party_type=NULL, related_party_id=NULL, updated_at=NOW()
         WHERE id=?`,
        [
          nickName !== undefined ? nickName : existing.nick_name,
          email !== undefined ? email : existing.email,
          phone !== undefined ? phone : existing.phone,
          department.deptId,
          department.deptName,
          await resolveRoleName(Array.isArray(roles) ? roles : targetUser.roles, roleName !== undefined ? roleName : existing.role_name),
          status !== undefined ? status : existing.status,
          id
        ]
      )

      if (Array.isArray(roles)) {
        await conn.run('DELETE FROM user_roles WHERE user_id = ?', [id])
        for (const role of roles) {
          await conn.run('INSERT INTO user_roles (user_id, role) VALUES (?, ?)', [id, role])
        }
      }
    })
    res.json({ code: 200, message: '更新成功' })
  } catch (error) {
    console.error('更新用户失败:', error.message)
    res.json({ code: 500, message: '更新失败' })
  }
})

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (id === req.user.id) return res.json({ code: 400, message: '不能删除自己' })

  const targetUser = await getUserById(id)
  if (!targetUser) return res.json({ code: 404, message: '用户不存在' })
  if (targetUser.roles.includes('administrator')) return res.json({ code: 400, message: '不能删除超级管理员' })

  try {
    await db.run('DELETE FROM users WHERE id = ?', [id])
    res.json({ code: 200, message: '删除成功' })
  } catch (error) {
    console.error('删除用户失败:', error.message)
    res.json({ code: 500, message: '删除失败' })
  }
})

router.put('/:id/status', async (req, res) => {
  const id = Number(req.params.id)
  const { status } = req.body

  if (id === req.user.id) return res.json({ code: 400, message: '不能修改自己的状态' })

  const targetUser = await getUserById(id)
  if (!targetUser) return res.json({ code: 404, message: '用户不存在' })
  if (targetUser.roles.includes('administrator') && !req.user.roles.includes('administrator')) {
    return res.json({ code: 403, message: '无权修改超级管理员状态' })
  }

  try {
    await db.run('UPDATE users SET status=?, updated_at=NOW() WHERE id=?', [status, id])
    if (status === 0) await db.run('DELETE FROM tokens WHERE user_id = ?', [id])
    res.json({ code: 200, message: '状态更新成功' })
  } catch (error) {
    console.error('更新用户状态失败:', error.message)
    res.json({ code: 500, message: '状态更新失败' })
  }
})

router.put('/:id/reset-password', async (req, res) => {
  const id = Number(req.params.id)
  const { password } = req.body

  if (!password || password.length < 6) return res.json({ code: 400, message: '密码不能为空且至少6个字符' })

  const targetUser = await getUserById(id)
  if (!targetUser) return res.json({ code: 404, message: '用户不存在' })
  if (targetUser.roles.includes('administrator') && !req.user.roles.includes('administrator')) {
    return res.json({ code: 403, message: '无权重置超级管理员密码' })
  }

  try {
    await db.run('UPDATE users SET password=?, updated_at=NOW() WHERE id=?', [bcrypt.hashSync(password, 10), id])
    await db.run('DELETE FROM tokens WHERE user_id = ?', [id])
    res.json({ code: 200, message: '密码重置成功' })
  } catch (error) {
    console.error('重置密码失败:', error.message)
    res.json({ code: 500, message: '重置密码失败' })
  }
})

module.exports = router
