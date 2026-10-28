const express = require('express')
const { db } = require('../db/index')
const { dbMenuToApiMenu } = require('../db/helpers')
const { authMiddleware, roleMiddleware } = require('../middleware/auth')

const router = express.Router()

router.use(authMiddleware)

// 获取当前用户可访问的菜单
router.get('/accessible', async (req, res) => {
  const user = req.user
  if (!user) return res.json({ code: 401, message: '未授权' })

  try {
    // administrator 拥有所有菜单
    if (user.roles.includes('administrator')) {
      const rows = await db.all('SELECT * FROM menus ORDER BY sort')
      return res.json({ code: 200, message: '获取成功', data: rows.map(dbMenuToApiMenu) })
    }

    // 根据用户角色查 role_menus 获取菜单ID
    const roleKeys = user.roles
    if (!roleKeys.length) {
      return res.json({ code: 200, message: '获取成功', data: [] })
    }

    // 查用户角色对应的 role ids
    const placeholders = roleKeys.map(() => '?').join(',')
    const roleRows = await db.all(`SELECT id FROM roles WHERE role_key IN (${placeholders}) AND status = 1`, roleKeys)
    const roleIds = roleRows.map(r => r.id)

    if (!roleIds.length) {
      return res.json({ code: 200, message: '获取成功', data: [] })
    }

    // 查 role_menus 获取去重的菜单ID
    const rolePlaceholders = roleIds.map(() => '?').join(',')
    const menuIdRows = await db.all(`SELECT DISTINCT menu_id FROM role_menus WHERE role_id IN (${rolePlaceholders})`, roleIds)
    const menuIds = new Set(menuIdRows.map(r => r.menu_id))

    if (!menuIds.size) {
      return res.json({ code: 200, message: '获取成功', data: [] })
    }

    // 查所有菜单（需要补充父级菜单确保树结构完整）
    const allMenus = await db.all('SELECT * FROM menus ORDER BY sort')

    // 补充父级菜单
    const addParents = async (ids, menus) => {
      const result = new Set(ids)
      let changed = true
      while (changed) {
        changed = false
        for (const menu of menus) {
          if (result.has(menu.id) && menu.parent_id && !result.has(menu.parent_id)) {
            result.add(menu.parent_id)
            changed = true
          }
        }
      }
      return result
    }

    const fullMenuIds = addParents(menuIds, allMenus)
    const accessibleMenus = allMenus.filter(m => fullMenuIds.has(m.id))

    res.json({ code: 200, message: '获取成功', data: accessibleMenus.map(dbMenuToApiMenu) })
  } catch (error) {
    console.error('获取可访问菜单失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function parseMenuRoles(value, fallback = []) {
  if (Array.isArray(value)) {
    return value.filter(role => typeof role === 'string' && role.trim())
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.filter(role => typeof role === 'string' && role.trim())
      }
    } catch (error) {
      return fallback
    }
  }

  return fallback
}

async function ensureMenuNameUnique(name, excludeId = null) {
  const existing = excludeId == null
    ? await db.get('SELECT id FROM menus WHERE name = ?', [name])
    : await db.get('SELECT id FROM menus WHERE name = ? AND id != ?', [name, excludeId])

  if (existing) {
    throw new Error('路由名称已存在，请更换后重试')
  }
}

async function ensureSiblingPathUnique(parentId, menuPath, excludeId = null) {
  let existing

  if (parentId == null) {
    existing = excludeId == null
      ? await db.get('SELECT id FROM menus WHERE parent_id IS NULL AND path = ?', [menuPath])
      : await db.get('SELECT id FROM menus WHERE parent_id IS NULL AND path = ? AND id != ?', [menuPath, excludeId])
  } else {
    existing = excludeId == null
      ? await db.get('SELECT id FROM menus WHERE parent_id = ? AND path = ?', [parentId, menuPath])
      : await db.get('SELECT id FROM menus WHERE parent_id = ? AND path = ? AND id != ?', [parentId, menuPath, excludeId])
  }

  if (existing) {
    throw new Error('同级菜单下路由路径已存在，请更换后重试')
  }
}

async function getParentMenu(parentId) {
  if (parentId == null) return null
  const parent = await db.get('SELECT * FROM menus WHERE id = ?', [parentId])
  if (!parent) {
    throw new Error('上级菜单不存在')
  }
  return parent
}

async function getDescendantIds(menuId) {
  const rows = await db.all('SELECT id, parent_id FROM menus')
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

  walk(menuId)
  return descendants
}

function ensureParentAllowed(menuId, parentId) {
  if (parentId == null) return
  if (menuId === parentId) {
    throw new Error('上级菜单不能选择自己')
  }

  const descendants = getDescendantIds(menuId)
  if (descendants.has(parentId)) {
    throw new Error('上级菜单不能选择当前菜单或其子菜单')
  }
}

function getLockedFieldLabels(body = {}) {
  const lockedFields = []

  if (Object.prototype.hasOwnProperty.call(body, 'name')) lockedFields.push('路由名称')
  if (Object.prototype.hasOwnProperty.call(body, 'path')) lockedFields.push('路由路径')
  if (Object.prototype.hasOwnProperty.call(body, 'component')) lockedFields.push('组件路径')
  if (Object.prototype.hasOwnProperty.call(body, 'redirect')) lockedFields.push('重定向')

  const meta = body.meta || {}
  if (Object.prototype.hasOwnProperty.call(meta, 'platform')) lockedFields.push('平台归属')
  if (Object.prototype.hasOwnProperty.call(meta, 'layout')) lockedFields.push('布局模式')
  if (Object.prototype.hasOwnProperty.call(meta, 'roles')) lockedFields.push('角色权限')

  return lockedFields
}

async function getRoleIdsByKeys(roleKeys) {
  if (!roleKeys.length) return []
  const placeholders = roleKeys.map(() => '?').join(',')
  const rows = await db.all(`SELECT id, role_key FROM roles WHERE role_key IN (${placeholders})`, roleKeys)
  return rows.map(row => row.id)
}

async function syncRoleMenus(menuId, roleKeys) {
  await db.run('DELETE FROM role_menus WHERE menu_id = ?', [menuId])

  const roleIds = getRoleIdsByKeys(roleKeys)
  if (!roleIds.length) return

  
  roleIds.forEach(async roleId => {
    await db.run('INSERT INTO role_menus (role_id, menu_id) VALUES (?, ?)', [roleId, menuId])
  })
}

function buildGeneratedMenuName(id) {
  return `menu_${id}`
}

function buildGeneratedMenuPath(parentId, id) {
  return parentId == null ? `/menu-${id}` : `entry-${id}`
}

function buildTempMenuName() {
  return `menu_temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function buildTempMenuPath(parentId) {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  return parentId == null ? `/menu-temp-${suffix}` : `entry-temp-${suffix}`
}

router.get('/', roleMiddleware('administrator', 'admin'), async (req, res) => {
  const rows = await db.all('SELECT * FROM menus ORDER BY sort, id')
  res.json({ code: 200, message: '获取成功', data: rows.map(dbMenuToApiMenu) })
})

router.post('/', roleMiddleware('administrator', 'admin'), async (req, res) => {
  const { parentId, name, path: rawPath, component, redirect, meta, sort } = req.body

  try {
    const normalizedParentId = parentId ? Number(parentId) : null
    const parent = getParentMenu(normalizedParentId)
    const menuName = normalizeText(name)
    const menuPath = normalizeText(rawPath)
    const componentPath = normalizeText(component)
    const title = normalizeText(meta?.title)
    const icon = normalizeText(meta?.icon)
    const platform = parent ? parent.platform : normalizeText(meta?.platform)
    const layout = parent ? '' : normalizeText(meta?.layout)
    const redirectPath = normalizeText(redirect)
    const roleKeys = parseMenuRoles(meta?.roles)

    if (!title) {
      return res.json({ code: 400, message: '请输入菜单名称' })
    }
    if (!menuName) {
      return res.json({ code: 400, message: '请输入路由名称' })
    }
    if (!menuPath) {
      return res.json({ code: 400, message: '请输入路由路径' })
    }
    if (!componentPath) {
      return res.json({ code: 400, message: '请输入组件路径' })
    }
    if (!platform) {
      return res.json({ code: 400, message: '顶级菜单必须选择平台归属' })
    }
    if (!parent && !layout) {
      return res.json({ code: 400, message: '顶级菜单必须选择布局模式' })
    }

    const normalizedPath = parent
      ? menuPath.replace(/^\/+/, '')
      : (menuPath.startsWith('/') ? menuPath : `/${menuPath}`)

    ensureMenuNameUnique(menuName)
    ensureSiblingPathUnique(normalizedParentId, normalizedPath)

    await db.transaction(async (conn) => {
      const result = await db.run(
        'INSERT INTO menus (parent_id, source_menu_id, name, path, component, redirect, title, icon, layout, platform, affix, hidden, sort, roles) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      , [normalizedParentId,
        null,
        menuName,
        normalizedPath,
        componentPath,
        redirectPath,
        title,
        icon,
        layout,
        platform,
        meta?.affix ? 1 : 0,
        meta?.hidden ? 1 : 0,
        sort || 0,
        JSON.stringify(roleKeys)])

      const menuId = Number(result.insertId)
      syncRoleMenus(menuId, roleKeys)
      return menuId
    })

    const menuId = createTransaction()
    const newMenu = await db.get('SELECT * FROM menus WHERE id = ?', [menuId])
    res.json({ code: 200, message: '添加成功', data: dbMenuToApiMenu(newMenu) })
  } catch (error) {
    console.error('添加菜单失败:', error.message)
    res.json({ code: 400, message: error.message || '添加失败' })
  }
})

router.get('/:id/buttons', roleMiddleware('administrator', 'admin'), async (req, res) => {
  const menuId = Number(req.params.id)

  try {
    const menu = await db.get('SELECT * FROM menus WHERE id = ?', [menuId])
    if (!menu) {
      return res.json({ code: 404, message: '菜单不存在' })
    }

    const buttons = await db.all('SELECT * FROM menu_buttons WHERE menu_id = ? ORDER BY sort, id', [menuId])
    res.json({ code: 200, message: '获取成功', data: buttons })
  } catch (error) {
    console.error('获取按钮权限失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

router.put('/:id', roleMiddleware('administrator', 'admin'), async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT * FROM menus WHERE id = ?', [id])
  if (!existing) return res.json({ code: 404, message: '菜单不存在' })

  const lockedFields = getLockedFieldLabels(req.body)
  if (lockedFields.length) {
    return res.json({
      code: 400,
      message: `已有菜单不允许修改${lockedFields.join('、')}；如需在其他位置使用，请使用发布功能。`
    })
  }

  try {
    const nextParentId = Object.prototype.hasOwnProperty.call(req.body, 'parentId')
      ? (req.body.parentId ? Number(req.body.parentId) : null)
      : existing.parent_id

    ensureParentAllowed(id, nextParentId)
    const parent = getParentMenu(nextParentId)

    if (parent && parent.platform !== existing.platform) {
      return res.json({ code: 400, message: '已有菜单不允许跨平台移动；如需跨平台复用，请使用发布功能。' })
    }

    ensureSiblingPathUnique(nextParentId, existing.path, id)

    await db.run(
      'UPDATE menus SET parent_id=?, title=?, icon=?, affix=?, hidden=?, sort=?, updated_at=NOW() WHERE id=?'
    , [nextParentId,
      req.body.meta?.title !== undefined ? normalizeText(req.body.meta.title) : existing.title,
      req.body.meta?.icon !== undefined ? normalizeText(req.body.meta.icon) : existing.icon,
      req.body.meta?.affix !== undefined ? (req.body.meta.affix ? 1 : 0) : existing.affix,
      req.body.meta?.hidden !== undefined ? (req.body.meta.hidden ? 1 : 0) : existing.hidden,
      req.body.sort !== undefined ? req.body.sort : existing.sort,
      id])

    const updated = await db.get('SELECT * FROM menus WHERE id = ?', [id])
    res.json({ code: 200, message: '更新成功', data: dbMenuToApiMenu(updated) })
  } catch (error) {
    console.error('更新菜单失败:', error.message)
    res.json({ code: 400, message: error.message || '更新失败' })
  }
})

router.post('/:id/publish', roleMiddleware('administrator', 'admin'), async (req, res) => {
  const sourceId = Number(req.params.id)
  const source = await db.get('SELECT * FROM menus WHERE id = ?', [sourceId])
  if (!source) {
    return res.json({ code: 404, message: '来源菜单不存在' })
  }

  const { parentId, meta, sort } = req.body

  try {
    const normalizedParentId = parentId ? Number(parentId) : null
    const parent = getParentMenu(normalizedParentId)
    const title = normalizeText(meta?.title)
    const icon = normalizeText(meta?.icon)
    const platform = parent ? parent.platform : normalizeText(meta?.platform)
    const layout = parent ? '' : normalizeText(meta?.layout)
    const roleKeys = parseMenuRoles(source.roles)

    if (!title) {
      return res.json({ code: 400, message: '请输入菜单名称' })
    }
    if (!platform) {
      return res.json({ code: 400, message: '顶级发布必须选择平台归属' })
    }
    if (!parent && !layout) {
      return res.json({ code: 400, message: '顶级发布必须选择布局模式' })
    }

    await db.transaction(async (conn) => {
      const result = await db.run(
        'INSERT INTO menus (parent_id, source_menu_id, name, path, component, redirect, title, icon, layout, platform, affix, hidden, sort, roles) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      , [normalizedParentId,
        source.id,
        buildTempMenuName(),
        buildTempMenuPath(normalizedParentId),
        source.component,
        source.redirect || '',
        title,
        icon,
        layout,
        platform,
        meta?.affix ? 1 : 0,
        meta?.hidden ? 1 : 0,
        sort || 0,
        JSON.stringify(roleKeys)])

      const menuId = Number(result.insertId)
      await db.run(
        'UPDATE menus SET name = ?, path = ?, updated_at = NOW() WHERE id = ?'
      , [buildGeneratedMenuName(menuId),
        buildGeneratedMenuPath(normalizedParentId, menuId),
        menuId])

      syncRoleMenus(menuId, roleKeys)
      return menuId
    })

    const menuId = publishTransaction()
    const publishedMenu = await db.get('SELECT * FROM menus WHERE id = ?', [menuId])
    res.json({ code: 200, message: '发布成功', data: dbMenuToApiMenu(publishedMenu) })
  } catch (error) {
    console.error('发布菜单失败:', error.message)
    res.json({ code: 400, message: error.message || '发布失败' })
  }
})

router.delete('/:id', roleMiddleware('administrator', 'admin'), async (req, res) => {
  const id = Number(req.params.id)
  const hasChildren = (await db.get('SELECT COUNT(*) as count FROM menus WHERE parent_id = ?', [id])).count
  if (hasChildren > 0) return res.json({ code: 400, message: '该菜单下有子菜单，请先删除子菜单' })

  const publishedCount = (await db.get('SELECT COUNT(*) as count FROM menus WHERE source_menu_id = ?', [id])).count
  if (publishedCount > 0) {
    return res.json({ code: 400, message: '该菜单已发布到其他位置，请先删除发布副本' })
  }

  const result = await db.run('DELETE FROM menus WHERE id = ?', [id])
  if (result.changes === 0) return res.json({ code: 404, message: '菜单不存在' })
  res.json({ code: 200, message: '删除成功' })
})

module.exports = router
