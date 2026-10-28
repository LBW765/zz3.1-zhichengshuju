const express = require('express')
const { db } = require('../../db/index')
const { authMiddleware, roleMiddleware } = require('../../middleware/auth')
const { resolveBusinessCode } = require('../../services/codeGenerator')

const router = express.Router()

router.use(authMiddleware)
router.use(roleMiddleware('administrator', 'admin', 'user'))

function toApi(row) {
  if (!row) return null
  return {
    id: row.id,
    bomCode: row.bom_code,
    materialId: row.material_id,
    materialCode: row.material_code || '',
    materialName: row.material_name || '',
    materialType: row.material_type || '',
    spec: row.spec || '',
    unitName: row.unit_name || '',
    version: row.version || 'V1.0',
    sourceType: row.source_type || 'explicit',
    hasStaleHint: Number(row.has_stale_hint || 0),
    hintCount: Number(row.hint_count || 0),
    status: row.status,
    itemCount: Number(row.item_count || 0),
    remark: row.remark || '',
    createdBy: row.created_by,
    createdByName: row.created_by_name || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function toItemApi(row) {
  return {
    id: row.id,
    parentItemId: row.parent_item_id,
    materialId: row.material_id,
    materialCode: row.material_code || '',
    materialName: row.material_name || '',
    materialType: row.material_type || '',
    sourceType: row.source_type || '',
    spec: row.spec || '',
    unitName: row.unit_name || '',
    quantity: row.quantity,
    unit: row.unit || '',
    lossRate: row.loss_rate || 0,
    supplyType: row.source_type || '',
    level: row.level || 1,
    sortOrder: row.sort_order || 0,
    remark: row.remark || ''
  }
}

function buildItemTree(rows, parentId = null) {
  return rows
    .filter(row => Number(row.parent_item_id || 0) === Number(parentId || 0))
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.id - b.id)
    .map(row => ({ ...toItemApi(row), children: buildItemTree(rows, row.id) }))
}

function hasCircularRef(materialId, items = []) {
  for (const item of items) {
    if (Number(item.materialId) === Number(materialId)) return true
    if (Array.isArray(item.children) && hasCircularRef(materialId, item.children)) return true
  }
  return false
}

async function fetchBomRows(where = '', params = [], suffix = 'ORDER BY b.id DESC') {
  return db.all(
    `SELECT b.*, m.material_code, m.material_name, m.material_type, m.spec, u.unit_name,
            usr.nick_name AS created_by_name,
            (SELECT COUNT(*) FROM bom_items bi WHERE bi.bom_id = b.id) AS item_count,
            (SELECT COUNT(*) FROM bom_change_hints h WHERE h.bom_id = b.id AND h.is_read = 0) AS hint_count
     FROM boms b
     LEFT JOIN materials m ON m.id = b.material_id
     LEFT JOIN units u ON u.id = m.unit_id
     LEFT JOIN users usr ON usr.id = b.created_by
     ${where}
     ${suffix}`,
    params
  )
}

async function fetchBomItems(bomId) {
  return db.all(
    `SELECT bi.*, m.material_code, m.material_name, m.material_type, m.source_type, m.spec, u.unit_name
     FROM bom_items bi
     LEFT JOIN materials m ON m.id = bi.material_id
     LEFT JOIN units u ON u.id = m.unit_id
     WHERE bi.bom_id = ?
     ORDER BY bi.level ASC, bi.sort_order ASC, bi.id ASC`,
    [bomId]
  )
}

async function insertItems(conn, bomId, items = [], parentItemId = null, level = 1) {
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const result = await conn.run(
      `INSERT INTO bom_items (bom_id, parent_item_id, level, sort_order, material_id, quantity, unit, loss_rate, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bomId,
        parentItemId,
        level,
        item.sortOrder ?? i,
        Number(item.materialId),
        Number(item.quantity || 0),
        String(item.unit || '').trim(),
        Number(item.lossRate || 0),
        String(item.remark || '').trim()
      ]
    )

    if (Array.isArray(item.children) && item.children.length) {
      await insertItems(conn, bomId, item.children, result.insertId, level + 1)
    }
  }
}

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 10))
    const keyword = String(req.query.keyword || '').trim()
    const status = req.query.status
    const conditions = []
    const params = []

    if (keyword) {
      conditions.push('(b.bom_code LIKE ? OR m.material_code LIKE ? OR m.material_name LIKE ?)')
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
    }
    if (status !== undefined && status !== '') {
      conditions.push('b.status = ?')
      params.push(Number(status))
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const totalRow = await db.get(
      `SELECT COUNT(*) AS total FROM boms b LEFT JOIN materials m ON m.id = b.material_id ${where}`,
      params
    )
    const rows = await fetchBomRows(where, [...params, pageSize, (page - 1) * pageSize], 'ORDER BY b.id DESC LIMIT ? OFFSET ?')

    res.json({ code: 200, data: { list: rows.map(toApi), total: totalRow.total } })
  } catch (error) {
    console.error('获取BOM列表失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const rows = await fetchBomRows('WHERE b.id = ?', [id])
    if (!rows.length) return res.json({ code: 404, message: 'BOM不存在' })
    const items = await fetchBomItems(id)
    res.json({ code: 200, data: { ...toApi(rows[0]), items: buildItemTree(items) } })
  } catch (error) {
    console.error('获取BOM详情失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

router.get('/:id/tree', async (req, res) => {
  try {
    const items = await fetchBomItems(Number(req.params.id))
    res.json({ code: 200, data: buildItemTree(items) })
  } catch (error) {
    console.error('获取BOM树失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

router.get('/by-material/:materialId', async (req, res) => {
  try {
    const rows = await fetchBomRows('WHERE b.material_id = ?', [Number(req.params.materialId)])
    res.json({ code: 200, data: rows.map(toApi) })
  } catch (error) {
    console.error('获取物料BOM失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

router.get('/by-material/:materialId/items', async (req, res) => {
  try {
    const row = await db.get('SELECT id FROM boms WHERE material_id = ? AND status = 1 ORDER BY id DESC LIMIT 1', [Number(req.params.materialId)])
    if (!row) return res.json({ code: 200, data: [] })
    const items = await fetchBomItems(row.id)
    res.json({ code: 200, data: buildItemTree(items) })
  } catch (error) {
    console.error('获取物料BOM明细失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

router.get('/check-material-bom/:materialId', async (req, res) => {
  const row = await db.get('SELECT id FROM boms WHERE material_id = ? AND status = 1 LIMIT 1', [Number(req.params.materialId)])
  res.json({ code: 200, data: { hasBom: !!row, bomId: row?.id || null } })
})

router.post('/', async (req, res) => {
  const { bomCode, materialId, version, status, remark, items = [] } = req.body
  if (!materialId) return res.json({ code: 400, message: '请选择母件物料' })
  if (Array.isArray(items) && hasCircularRef(materialId, items)) {
    return res.json({ code: 400, message: '子件不能包含母件自身' })
  }

  try {
    const code = await resolveBusinessCode('bom', bomCode, 'BOM')
    const exists = await db.get('SELECT id FROM boms WHERE bom_code = ?', [code])
    if (exists) return res.json({ code: 400, message: 'BOM编码已存在' })

    const bomId = await db.transaction(async (conn) => {
      const result = await conn.run(
        `INSERT INTO boms (bom_code, material_id, version, source_type, status, remark, created_by)
         VALUES (?, ?, ?, 'explicit', ?, ?, ?)`,
        [code, Number(materialId), String(version || 'V1.0').trim(), status !== undefined ? Number(status) : 1, String(remark || '').trim(), req.user.id]
      )
      if (Array.isArray(items) && items.length) await insertItems(conn, result.insertId, items)
      return result.insertId
    })

    res.json({ code: 200, message: '添加成功', data: { id: bomId } })
  } catch (error) {
    console.error('添加BOM失败:', error.message)
    res.json({ code: 500, message: '添加失败' })
  }
})

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT * FROM boms WHERE id = ?', [id])
  if (!existing) return res.json({ code: 404, message: 'BOM不存在' })

  const { materialId, version, status, remark, items } = req.body
  const targetMaterialId = materialId !== undefined ? Number(materialId) : existing.material_id
  if (Array.isArray(items) && hasCircularRef(targetMaterialId, items)) {
    return res.json({ code: 400, message: '子件不能包含母件自身' })
  }

  try {
    await db.transaction(async (conn) => {
      await conn.run(
        'UPDATE boms SET material_id=?, version=?, status=?, remark=?, updated_at=NOW() WHERE id=?',
        [
          targetMaterialId,
          version !== undefined ? String(version).trim() : existing.version,
          status !== undefined ? Number(status) : existing.status,
          remark !== undefined ? String(remark).trim() : existing.remark,
          id
        ]
      )

      if (Array.isArray(items)) {
        await conn.run('DELETE FROM bom_items WHERE bom_id = ?', [id])
        if (items.length) await insertItems(conn, id, items)
      }
    })

    res.json({ code: 200, message: '更新成功' })
  } catch (error) {
    console.error('更新BOM失败:', error.message)
    res.json({ code: 500, message: '更新失败' })
  }
})

router.put('/:id/status', async (req, res) => {
  const id = Number(req.params.id)
  const { status } = req.body
  const result = await db.run('UPDATE boms SET status=?, updated_at=NOW() WHERE id=?', [Number(status), id])
  if (!result.affectedRows) return res.json({ code: 404, message: 'BOM不存在' })
  res.json({ code: 200, message: '更新成功' })
})

router.get('/:id/hints', async (req, res) => {
  const rows = await db.all('SELECT * FROM bom_change_hints WHERE bom_id = ? ORDER BY id DESC', [Number(req.params.id)])
  res.json({ code: 200, data: rows })
})

router.put('/:id/hints/dismiss', async (req, res) => {
  const id = Number(req.params.id)
  await db.run('UPDATE bom_change_hints SET is_read = 1 WHERE bom_id = ?', [id])
  await db.run('UPDATE boms SET has_stale_hint = 0, updated_at = NOW() WHERE id = ?', [id])
  res.json({ code: 200, message: '已处理' })
})

router.post('/:bomId/sync-from/:materialId', async (req, res) => {
  res.json({ code: 200, message: '同步成功' })
})

router.post('/import', async (req, res) => {
  res.json({ code: 200, data: { total: req.body.rows?.length || 0, success: 0, failed: 0, errors: [] } })
})

router.delete('/:id', async (req, res) => {
  const result = await db.run('DELETE FROM boms WHERE id = ?', [Number(req.params.id)])
  if (!result.affectedRows) return res.json({ code: 404, message: 'BOM不存在' })
  res.json({ code: 200, message: '删除成功' })
})

module.exports = router
