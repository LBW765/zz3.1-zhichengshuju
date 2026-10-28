const express = require('express')
const { db } = require('../db')
const { authMiddleware, roleMiddleware } = require('../middleware/auth')

const router = express.Router()

// SQL 中 datetime 的写法
const NOW_SQL = `NOW()`

// 获取按钮权限列表
router.get('/', authMiddleware, roleMiddleware('administrator', 'admin'), async (req, res) => {
  const menuId = req.query.menuId

  try {
    let query = 'SELECT * FROM permissions'
    const params = []

    if (menuId) {
      query += ' WHERE menu_id = ?'
      params.push(Number(menuId))
    }

    query += ' ORDER BY created_at DESC'

    const rows = await db.all(query, params)
    const list = rows.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      menuId: row.menu_id,
      type: row.type,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))

    res.json({ code: 200, message: '获取成功', data: list })
  } catch (error) {
    console.error('获取按钮权限列表失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

// 新增按钮权限
router.post('/', authMiddleware, roleMiddleware('administrator', 'admin'), async (req, res) => {
  const { code, name, menuId, type, description } = req.body

  if (!code || !code.trim()) {
    return res.json({ code: 400, message: '权限标识不能为空' })
  }
  if (!name || !name.trim()) {
    return res.json({ code: 400, message: '权限名称不能为空' })
  }

  const existing = await db.get('SELECT id FROM permissions WHERE code = ?', [code.trim()])
  if (existing) {
    return res.json({ code: 400, message: '权限标识已存在' })
  }

  try {
    const result = await db.run(
      'INSERT INTO permissions (code, name, menu_id, type, description) VALUES (?, ?, ?, ?, ?)'
    , [code.trim(), name.trim(), menuId || null, type || 'button', description || ''])

    res.json({ code: 200, message: '添加成功', data: { id: Number(result.insertId) } })
  } catch (error) {
    console.error('添加按钮权限失败:', error.message)
    res.json({ code: 500, message: '添加失败' })
  }
})

// 更新按钮权限
router.put('/:id', authMiddleware, roleMiddleware('administrator', 'admin'), async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT * FROM permissions WHERE id = ?', [id])
  if (!existing) {
    return res.json({ code: 404, message: '权限不存在' })
  }

  const { name, menuId, type, description } = req.body

  try {
    await db.run(
      `UPDATE permissions SET name=?, menu_id=?, type=?, description=?, updated_at=${NOW_SQL} WHERE id=?`
    , [name !== undefined ? name : existing.name,
      menuId !== undefined ? menuId : existing.menu_id,
      type !== undefined ? type : existing.type,
      description !== undefined ? description : existing.description,
      id])
    res.json({ code: 200, message: '更新成功' })
  } catch (error) {
    console.error('更新按钮权限失败:', error.message)
    res.json({ code: 500, message: '更新失败' })
  }
})

// 删除按钮权限
router.delete('/:id', authMiddleware, roleMiddleware('administrator', 'admin'), async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT * FROM permissions WHERE id = ?', [id])
  if (!existing) {
    return res.json({ code: 404, message: '权限不存在' })
  }

  try {
    await db.run('DELETE FROM permissions WHERE id = ?', [id])
    res.json({ code: 200, message: '删除成功' })
  } catch (error) {
    console.error('删除按钮权限失败:', error.message)
    res.json({ code: 500, message: '删除失败' })
  }
})

module.exports = router
