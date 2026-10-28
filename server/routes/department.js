const express = require('express')
const { db } = require('../db/index')
const { authMiddleware, roleMiddleware } = require('../middleware/auth')

const router = express.Router()

// 所有部门管理接口需要认证 + 管理员权限
router.use(authMiddleware)
router.use(roleMiddleware('administrator', 'admin'))

// 辅助函数：构建树形结构
function buildDepartmentTree(departments) {
  const map = new Map()
  const roots = []

  // 先创建映射
  departments.forEach(async dept => {
    map.set(dept.id, { ...dept, children: [] })
  })

  // 构建树形结构
  departments.forEach(async dept => {
    const node = map.get(dept.id)
    if (dept.parent_id === 0 || dept.parent_id === null) {
      roots.push(node)
    } else {
      const parent = map.get(dept.parent_id)
      if (parent) {
        parent.children.push(node)
      } else {
        // 父节点不存在，作为根节点
        roots.push(node)
      }
    }
  })

  return roots
}

// 辅助函数：数据库行转 API 格式
function dbDeptToApiDept(row) {
  return {
    id: row.id,
    deptName: row.dept_name,
    parentId: row.parent_id,
    sortOrder: row.sort_order,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

// 辅助函数：检查是否有子部门
async function hasChildren(deptId) {
  const count = (await db.get('SELECT COUNT(*) as count FROM departments WHERE parent_id = ?', [deptId])).count
  return count > 0
}

// 辅助函数：获取所有子部门ID（递归）
async function getDescendantIds(deptId) {
  const rows = await db.all('SELECT id, parent_id FROM departments')
  const childrenMap = new Map()

  rows.forEach(async row => {
    if (!childrenMap.has(row.parent_id)) {
      childrenMap.set(row.parent_id, [])
    }
    childrenMap.get(row.parent_id).push(row.id)
  })

  const descendants = new Set()
  const walk = async (parentId) => {
    const children = childrenMap.get(parentId) || []
    children.forEach(async childId => {
      if (descendants.has(childId)) return
      descendants.add(childId)
      walk(childId)
    })
  }

  walk(deptId)
  return descendants
}

// 获取部门列表（树形结构）
router.get('/', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM departments ORDER BY sort_order ASC, id ASC')
    const departments = rows.map(dbDeptToApiDept)
    const tree = buildDepartmentTree(departments)

    res.json({ code: 200, message: '获取成功', data: tree })
  } catch (error) {
    console.error('获取部门列表失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

// 新增部门
router.post('/', async (req, res) => {
  const { deptName, parentId, sortOrder, status } = req.body

  if (!deptName || !deptName.trim()) {
    return res.json({ code: 400, message: '部门名称不能为空' })
  }

  // 检查父部门是否存在
  if (parentId && parentId !== 0) {
    const parent = await db.get('SELECT id FROM departments WHERE id = ?', [parentId])
    if (!parent) {
      return res.json({ code: 400, message: '上级部门不存在' })
    }
  }

  try {
    const result = await db.run(
      'INSERT INTO departments (dept_name, parent_id, sort_order, status, created_by) VALUES (?, ?, ?, ?, ?)'
    , [deptName.trim(),
      parentId || 0,
      sortOrder !== undefined ? sortOrder : 0,
      status !== undefined ? status : 1,
      req.user.id])

    const newDept = await db.get('SELECT * FROM departments WHERE id = ?', [result.insertId])
    res.json({ code: 200, message: '添加成功', data: dbDeptToApiDept(newDept) })
  } catch (error) {
    console.error('添加部门失败:', error.message)
    res.json({ code: 500, message: '添加失败' })
  }
})

// 更新部门
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT * FROM departments WHERE id = ?', [id])

  if (!existing) {
    return res.json({ code: 404, message: '部门不存在' })
  }

  const { deptName, parentId, sortOrder, status } = req.body

  if (deptName !== undefined && !deptName.trim()) {
    return res.json({ code: 400, message: '部门名称不能为空' })
  }

  // 检查父部门
  if (parentId !== undefined && parentId !== 0) {
    // 不能选择自己作为父部门
    if (parentId === id) {
      return res.json({ code: 400, message: '上级部门不能选择自己' })
    }

    // 不能选择自己的子部门作为父部门
    const descendants = getDescendantIds(id)
    if (descendants.has(parentId)) {
      return res.json({ code: 400, message: '上级部门不能选择当前部门的子部门' })
    }

    // 检查父部门是否存在
    const parent = await db.get('SELECT id FROM departments WHERE id = ?', [parentId])
    if (!parent) {
      return res.json({ code: 400, message: '上级部门不存在' })
    }
  }

  try {
    await db.run(
      `UPDATE departments SET dept_name=?, parent_id=?, sort_order=?, status=?, updated_at=NOW() WHERE id=?`
    , [deptName !== undefined ? deptName.trim() : existing.dept_name,
      parentId !== undefined ? (parentId || 0) : existing.parent_id,
      sortOrder !== undefined ? sortOrder : existing.sort_order,
      status !== undefined ? status : existing.status,
      id])

    const updated = await db.get('SELECT * FROM departments WHERE id = ?', [id])
    res.json({ code: 200, message: '更新成功', data: dbDeptToApiDept(updated) })
  } catch (error) {
    console.error('更新部门失败:', error.message)
    res.json({ code: 500, message: '更新失败' })
  }
})

// 删除部门
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT * FROM departments WHERE id = ?', [id])

  if (!existing) {
    return res.json({ code: 404, message: '部门不存在' })
  }

  // 禁止删除根部门
  if (id === 1) {
    return res.json({ code: 400, message: '根部门不允许删除' })
  }

  // 检查是否有子部门
  if (hasChildren(id)) {
    return res.json({ code: 400, message: '该部门下有子部门，请先删除子部门' })
  }

  // 检查是否有用户关联
  const userCount = (await db.get('SELECT COUNT(*) as count FROM users WHERE dept_id = ?', [id])).count
  if (userCount > 0) {
    return res.json({ code: 400, message: `该部门下还有 ${userCount} 个用户，请先调整用户部门` })
  }

  try {
    await db.run('DELETE FROM departments WHERE id = ?', [id])
    res.json({ code: 200, message: '删除成功' })
  } catch (error) {
    console.error('删除部门失败:', error.message)
    res.json({ code: 500, message: '删除失败' })
  }
})

module.exports = router
