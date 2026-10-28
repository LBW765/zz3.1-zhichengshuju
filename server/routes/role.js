const express = require('express')
const { db } = require('../db/index')
const { authMiddleware, roleMiddleware } = require('../middleware/auth')

const router = express.Router()

// 所有角色管理接口需要认证 + 管理员权限
router.use(authMiddleware)
router.use(roleMiddleware('administrator', 'admin'))

function dbRoleToApiRole(role) {
  return {
    id: role.id,
    roleKey: role.role_key,
    roleName: role.role_name,
    description: role.description,
    status: role.status,
    sort: role.sort,
    createdAt: role.created_at,
    updatedAt: role.updated_at
  }
}

// 角色列表（分页+搜索）
router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 10))
  const offset = (page - 1) * pageSize
  const keyword = (req.query.keyword || '').trim()
  const status = req.query.status

  let conditions = ''
  const params = []

  if (keyword) {
    conditions += ' AND (role_key LIKE ? OR role_name LIKE ?)'
    const like = `%${keyword}%`
    params.push(like, like)
  }
  if (status !== undefined && status !== '') {
    conditions += ' AND status = ?'
    params.push(Number(status))
  }

  try {
    const total = (await db.get(`SELECT COUNT(*) as total FROM roles WHERE 1=1${conditions}`, params)).total
    const rows = await db.all(`SELECT * FROM roles WHERE 1=1${conditions} ORDER BY sort ASC, id ASC LIMIT ? OFFSET ?`, [...params, pageSize, offset])

    const list = []
    for (const row of rows) {
      const userCount = (await db.get('SELECT COUNT(*) as count FROM user_roles WHERE role = ?', [row.role_key])).count
      list.push({ ...dbRoleToApiRole(row), userCount })
    }

    res.json({ code: 200, message: '获取成功', data: { list, total, page, pageSize } })
  } catch (error) {
    console.error('获取角色列表失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

// 所有启用角色
router.get('/all', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM roles WHERE status = 1 ORDER BY sort ASC')
    res.json({ code: 200, message: '获取成功', data: rows.map(dbRoleToApiRole) })
  } catch (error) {
    console.error('获取所有角色失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

// 新增角色
router.post('/', async (req, res) => {
  const { roleKey, roleName, description, status, sort } = req.body

  if (!roleKey || !roleKey.trim()) {
    return res.json({ code: 400, message: '角色标识不能为空' })
  }
  if (!roleName || !roleName.trim()) {
    return res.json({ code: 400, message: '角色名称不能为空' })
  }

  const existing = await db.get('SELECT id FROM roles WHERE role_key = ?', [roleKey.trim()])
  if (existing) {
    return res.json({ code: 400, message: '角色标识已存在' })
  }

  try {
    const result = await db.run(
      'INSERT INTO roles (role_key, role_name, description, status, sort) VALUES (?, ?, ?, ?, ?)'
    , [roleKey.trim(), roleName.trim(), description || '', status !== undefined ? status : 1, sort !== undefined ? sort : 0])

    res.json({ code: 200, message: '添加成功', data: { id: Number(result.insertId) } })
  } catch (error) {
    console.error('添加角色失败:', error.message)
    res.json({ code: 500, message: '添加失败' })
  }
})

// 编辑角色
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT * FROM roles WHERE id = ?', [id])
  if (!existing) {
    return res.json({ code: 404, message: '角色不存在' })
  }

  const { roleName, description, status, sort } = req.body

  try {
    await db.run(
      `UPDATE roles SET role_name=?, description=?, status=?, sort=?, updated_at=NOW() WHERE id=?`
    , [roleName !== undefined ? roleName : existing.role_name,
      description !== undefined ? description : existing.description,
      status !== undefined ? status : existing.status,
      sort !== undefined ? sort : existing.sort,
      id])
    res.json({ code: 200, message: '更新成功' })
  } catch (error) {
    console.error('更新角色失败:', error.message)
    res.json({ code: 500, message: '更新失败' })
  }
})

// 删除角色
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT * FROM roles WHERE id = ?', [id])
  if (!existing) {
    return res.json({ code: 404, message: '角色不存在' })
  }

  if (existing.role_key === 'administrator') {
    return res.json({ code: 400, message: '不能删除超级管理员角色' })
  }

  // 检查是否有用户绑定该角色
  const bindCount = (await db.get('SELECT COUNT(*) as count FROM user_roles WHERE role = ?', [existing.role_key])).count
  if (bindCount > 0) {
    return res.json({ code: 400, message: `该角色下还有 ${bindCount} 个用户，请先解除绑定` })
  }

  try {
    await db.run('DELETE FROM roles WHERE id = ?', [id])
    res.json({ code: 200, message: '删除成功' })
  } catch (error) {
    console.error('删除角色失败:', error.message)
    res.json({ code: 500, message: '删除失败' })
  }
})

// 启用/禁用角色
router.put('/:id/status', async (req, res) => {
  const id = Number(req.params.id)
  const { status } = req.body

  const existing = await db.get('SELECT * FROM roles WHERE id = ?', [id])
  if (!existing) {
    return res.json({ code: 404, message: '角色不存在' })
  }

  if (existing.role_key === 'administrator') {
    return res.json({ code: 400, message: '不能禁用超级管理员角色' })
  }

  try {
    await db.run(`UPDATE roles SET status=?, updated_at=NOW() WHERE id=?`, [status, id])
    res.json({ code: 200, message: '状态更新成功' })
  } catch (error) {
    console.error('更新角色状态失败:', error.message)
    res.json({ code: 500, message: '状态更新失败' })
  }
})

// 获取角色菜单
router.get('/:id/menus', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT * FROM roles WHERE id = ?', [id])
  if (!existing) {
    return res.json({ code: 404, message: '角色不存在' })
  }

  try {
    const rows = await db.all('SELECT menu_id FROM role_menus WHERE role_id = ?', [id])
    const menuIds = rows.map(r => r.menu_id)
    res.json({ code: 200, message: '获取成功', data: { menuIds } })
  } catch (error) {
    console.error('获取角色菜单失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

// 设置角色菜单
router.put('/:id/menus', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT * FROM roles WHERE id = ?', [id])
  if (!existing) {
    return res.json({ code: 404, message: '角色不存在' })
  }

  const { menuIds } = req.body
  if (!Array.isArray(menuIds)) {
    return res.json({ code: 400, message: 'menuIds 必须是数组' })
  }

  try {
    await db.transaction(async (conn) => {
      await conn.run('DELETE FROM role_menus WHERE role_id = ?', [id])

      for (const menuId of menuIds) {
        await conn.run('INSERT INTO role_menus (role_id, menu_id) VALUES (?, ?)', [id, menuId])
      }
    })
    res.json({ code: 200, message: '设置成功' })
  } catch (error) {
    console.error('设置角色菜单失败:', error.message)
    res.json({ code: 500, message: '设置失败' })
  }
})

// 获取角色按钮权限
router.get('/:id/permissions', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT * FROM roles WHERE id = ?', [id])
  if (!existing) {
    return res.json({ code: 404, message: '角色不存在' })
  }

  try {
    const rows = await db.all('SELECT permission_id FROM role_permissions WHERE role_id = ?', [id])
    const permissionIds = rows.map(r => r.permission_id)
    res.json({ code: 200, message: '获取成功', data: { permissionIds } })
  } catch (error) {
    console.error('获取角色权限失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

// 更新角色按钮权限
router.put('/:id/permissions', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT * FROM roles WHERE id = ?', [id])
  if (!existing) {
    return res.json({ code: 404, message: '角色不存在' })
  }

  const { permissionIds } = req.body
  if (!Array.isArray(permissionIds)) {
    return res.json({ code: 400, message: 'permissionIds 必须是数组' })
  }

  try {
    await db.transaction(async (conn) => {
      await conn.run('DELETE FROM role_permissions WHERE role_id = ?', [id])

      for (const permissionId of permissionIds) {
        await conn.run('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [id, permissionId])
      }
    })
    res.json({ code: 200, message: '设置成功' })
  } catch (error) {
    console.error('设置角色权限失败:', error.message)
    res.json({ code: 500, message: '设置失败' })
  }
})

// 获取角色数据权限（按菜单）
router.get('/:id/data-scope', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT * FROM roles WHERE id = ?', [id])
  if (!existing) {
    return res.json({ code: 404, message: '角色不存在' })
  }

  try {
    const rows = await db.all('SELECT menu_id, data_scope, dept_ids, custom_conditions FROM role_data_permissions WHERE role_id = ?', [id])
    const menuScopes = {}
    rows.forEach(async row => {
      if (row.menu_id) {
        menuScopes[row.menu_id] = {
          scope: row.data_scope,
          departmentIds: JSON.parse(row.dept_ids || '[]'),
          customConditions: row.custom_conditions ? JSON.parse(row.custom_conditions) : null
        }
      }
    })
    res.json({ code: 200, message: '获取成功', data: { menuScopes } })
  } catch (error) {
    console.error('获取角色数据权限失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

// 更新角色数据权限（按菜单）
router.put('/:id/data-scope', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT * FROM roles WHERE id = ?', [id])
  if (!existing) {
    return res.json({ code: 404, message: '角色不存在' })
  }

  const { menuScopes } = req.body
  if (!menuScopes || typeof menuScopes !== 'object') {
    return res.json({ code: 400, message: 'menuScopes 必须是对象' })
  }

  try {
    await db.transaction(async (conn) => {
      await conn.run('DELETE FROM role_data_permissions WHERE role_id = ?', [id])

      for (const [menuId, config] of Object.entries(menuScopes)) {
        const { scope, departmentIds, customConditions } = config
        if (scope && ['all', 'department', 'self', 'custom'].includes(scope)) {
          await conn.run(
        'INSERT INTO role_data_permissions (role_id, menu_id, data_scope, dept_ids, custom_conditions) VALUES (?, ?, ?, ?, ?)'
      , [id,
            Number(menuId),
            scope,
            JSON.stringify(departmentIds || []),
            customConditions ? JSON.stringify(customConditions) : null])
        }
      }
    })
    res.json({ code: 200, message: '设置成功' })
  } catch (error) {
    console.error('设置角色数据权限失败:', error.message)
    res.json({ code: 500, message: '设置失败' })
  }
})

module.exports = router
