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
    materialCode: row.material_code,
    materialName: row.material_name,
    categoryId: row.category_id,
    categoryName: row.category_name || '',
    materialType: row.material_type || '',
    sourceType: row.source_type || '',
    spec: row.spec || '',
    unitId: row.unit_id,
    unitName: row.unit_name || '',
    unitCode: row.unit_code || '',
    auxUnitId: row.aux_unit_id,
    auxUnitName: row.aux_unit_name || '',
    auxUnitCode: row.aux_unit_code || '',
    weight: row.weight,
    price: row.price,
    defaultWarehouseId: row.default_warehouse_id,
    enableShelfLife: row.enable_shelf_life,
    shelfLifeDays: row.shelf_life_days,
    shelfLifeWarnDays: row.shelf_life_warn_days,
    enableSerial: row.enable_serial,
    enableBatch: row.enable_batch,
    enableInspection: row.enable_inspection,
    stockMin: row.stock_min,
    stockMax: row.stock_max,
    stagnantWarnDays: row.stagnant_warn_days,
    minPurchaseQty: row.min_purchase_qty,
    allowNegativeStock: row.allow_negative_stock,
    status: row.status,
    remark: row.remark || '',
    createdBy: row.created_by,
    createdByName: row.created_by_name || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

async function getDescendantCategoryIds(parentId) {
  const ids = [parentId]
  const children = await db.all('SELECT id FROM material_categories WHERE parent_id = ?', [parentId])
  for (const child of children) ids.push(...await getDescendantCategoryIds(child.id))
  return ids
}

function nullableNumber(value) {
  return value !== undefined && value !== null && value !== '' ? Number(value) : null
}

async function queryMaterials(where, params, paging = '') {
  return db.all(
    `SELECT m.*,
            c.category_name,
            u.unit_name, u.unit_code,
            au.unit_name AS aux_unit_name, au.unit_code AS aux_unit_code,
            usr.nick_name AS created_by_name
     FROM materials m
     LEFT JOIN material_categories c ON c.id = m.category_id
     LEFT JOIN units u ON u.id = m.unit_id
     LEFT JOIN units au ON au.id = m.aux_unit_id
     LEFT JOIN users usr ON usr.id = m.created_by
     WHERE 1=1${where}
     ORDER BY m.id DESC ${paging}`,
    params
  )
}

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 10))
    const keyword = String(req.query.keyword || '').trim()
    const categoryId = req.query.categoryId
    const materialType = String(req.query.materialType || '').trim()
    const sourceType = String(req.query.sourceType || '').trim()
    const status = req.query.status
    let where = ''
    const params = []

    if (keyword) {
      where += ' AND (m.material_code LIKE ? OR m.material_name LIKE ?)'
      params.push(`%${keyword}%`, `%${keyword}%`)
    }
    if (categoryId) {
      const ids = await getDescendantCategoryIds(Number(categoryId))
      where += ` AND m.category_id IN (${ids.map(() => '?').join(',')})`
      params.push(...ids)
    }
    if (materialType) {
      where += ' AND m.material_type = ?'
      params.push(materialType)
    }
    if (sourceType) {
      where += ' AND m.source_type = ?'
      params.push(sourceType)
    }
    if (status !== undefined && status !== '') {
      where += ' AND m.status = ?'
      params.push(Number(status))
    }

    const countRow = await db.get(`SELECT COUNT(*) AS total FROM materials m WHERE 1=1${where}`, params)
    const rows = await queryMaterials(where, [...params, pageSize, (page - 1) * pageSize], 'LIMIT ? OFFSET ?')
    res.json({ code: 200, data: { list: rows.map(toApi), total: countRow.total, page, pageSize } })
  } catch (error) {
    console.error('获取物料列表失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

router.get('/:id', async (req, res) => {
  const rows = await queryMaterials(' AND m.id = ?', [Number(req.params.id)])
  if (!rows.length) return res.json({ code: 404, message: '物料不存在' })
  res.json({ code: 200, data: toApi(rows[0]) })
})

router.post('/', async (req, res) => {
  const body = req.body
  const materialName = String(body.materialName || '').trim()
  if (!materialName) return res.json({ code: 400, message: '物料名称不能为空' })

  try {
    const code = await resolveBusinessCode('material', body.materialCode, 'WL')
    const exists = await db.get('SELECT id FROM materials WHERE material_code = ?', [code])
    if (exists) return res.json({ code: 400, message: '物料编码已存在' })

    const result = await db.run(
      `INSERT INTO materials (
        material_code, material_name, category_id, material_type, source_type, spec,
        unit_id, aux_unit_id, weight, price, default_warehouse_id,
        enable_shelf_life, shelf_life_days, shelf_life_warn_days,
        enable_serial, enable_batch, enable_inspection,
        stock_min, stock_max, stagnant_warn_days, min_purchase_qty, allow_negative_stock,
        status, remark, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code,
        materialName,
        body.categoryId || null,
        String(body.materialType || '').trim(),
        String(body.sourceType || '').trim(),
        String(body.spec || '').trim(),
        body.unitId || null,
        body.auxUnitId || null,
        nullableNumber(body.weight),
        nullableNumber(body.price),
        body.defaultWarehouseId || null,
        Number(body.enableShelfLife) || 0,
        nullableNumber(body.shelfLifeDays),
        nullableNumber(body.shelfLifeWarnDays),
        Number(body.enableSerial) || 0,
        Number(body.enableBatch) || 0,
        Number(body.enableInspection) || 0,
        nullableNumber(body.stockMin),
        nullableNumber(body.stockMax),
        nullableNumber(body.stagnantWarnDays),
        nullableNumber(body.minPurchaseQty),
        Number(body.allowNegativeStock) || 0,
        body.status !== undefined ? Number(body.status) : 1,
        String(body.remark || '').trim(),
        req.user.id
      ]
    )
    res.json({ code: 200, message: '添加成功', data: { id: result.insertId } })
  } catch (error) {
    console.error('添加物料失败:', error.message)
    res.json({ code: 500, message: '添加失败' })
  }
})

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT * FROM materials WHERE id = ?', [id])
  if (!existing) return res.json({ code: 404, message: '物料不存在' })

  const body = req.body
  const nextCode = body.materialCode !== undefined ? String(body.materialCode).trim() : existing.material_code
  if (nextCode !== existing.material_code) {
    const duplicate = await db.get('SELECT id FROM materials WHERE material_code = ? AND id != ?', [nextCode, id])
    if (duplicate) return res.json({ code: 400, message: '物料编码已存在' })
  }

  await db.run(
    `UPDATE materials SET
      material_code=?, material_name=?, category_id=?, material_type=?, source_type=?, spec=?,
      unit_id=?, aux_unit_id=?, weight=?, price=?, default_warehouse_id=?,
      enable_shelf_life=?, shelf_life_days=?, shelf_life_warn_days=?,
      enable_serial=?, enable_batch=?, enable_inspection=?,
      stock_min=?, stock_max=?, stagnant_warn_days=?, min_purchase_qty=?, allow_negative_stock=?,
      status=?, remark=?, updated_at=NOW()
     WHERE id=?`,
    [
      nextCode,
      body.materialName !== undefined ? String(body.materialName).trim() : existing.material_name,
      body.categoryId !== undefined ? (body.categoryId || null) : existing.category_id,
      body.materialType !== undefined ? String(body.materialType).trim() : existing.material_type,
      body.sourceType !== undefined ? String(body.sourceType).trim() : existing.source_type,
      body.spec !== undefined ? String(body.spec).trim() : existing.spec,
      body.unitId !== undefined ? (body.unitId || null) : existing.unit_id,
      body.auxUnitId !== undefined ? (body.auxUnitId || null) : existing.aux_unit_id,
      body.weight !== undefined ? nullableNumber(body.weight) : existing.weight,
      body.price !== undefined ? nullableNumber(body.price) : existing.price,
      body.defaultWarehouseId !== undefined ? (body.defaultWarehouseId || null) : existing.default_warehouse_id,
      body.enableShelfLife !== undefined ? Number(body.enableShelfLife) || 0 : existing.enable_shelf_life,
      body.shelfLifeDays !== undefined ? nullableNumber(body.shelfLifeDays) : existing.shelf_life_days,
      body.shelfLifeWarnDays !== undefined ? nullableNumber(body.shelfLifeWarnDays) : existing.shelf_life_warn_days,
      body.enableSerial !== undefined ? Number(body.enableSerial) || 0 : existing.enable_serial,
      body.enableBatch !== undefined ? Number(body.enableBatch) || 0 : existing.enable_batch,
      body.enableInspection !== undefined ? Number(body.enableInspection) || 0 : existing.enable_inspection,
      body.stockMin !== undefined ? nullableNumber(body.stockMin) : existing.stock_min,
      body.stockMax !== undefined ? nullableNumber(body.stockMax) : existing.stock_max,
      body.stagnantWarnDays !== undefined ? nullableNumber(body.stagnantWarnDays) : existing.stagnant_warn_days,
      body.minPurchaseQty !== undefined ? nullableNumber(body.minPurchaseQty) : existing.min_purchase_qty,
      body.allowNegativeStock !== undefined ? Number(body.allowNegativeStock) || 0 : existing.allow_negative_stock,
      body.status !== undefined ? Number(body.status) : existing.status,
      body.remark !== undefined ? String(body.remark).trim() : existing.remark,
      id
    ]
  )
  res.json({ code: 200, message: '更新成功' })
})

router.put('/:id/status', async (req, res) => {
  const result = await db.run('UPDATE materials SET status=?, updated_at=NOW() WHERE id=?', [Number(req.body.status), Number(req.params.id)])
  if (!result.affectedRows) return res.json({ code: 404, message: '物料不存在' })
  res.json({ code: 200, message: '更新成功' })
})

router.post('/import', async (req, res) => {
  res.json({ code: 200, data: { total: req.body.rows?.length || 0, success: 0, failed: 0, errors: [] } })
})

router.post('/export', async (req, res) => {
  const rows = await queryMaterials('', [])
  res.json({ code: 200, data: rows.map(toApi) })
})

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const inBom = await db.get('SELECT COUNT(*) AS count FROM bom_items WHERE material_id = ?', [id])
  if (inBom.count > 0) return res.json({ code: 400, message: '该物料已被BOM引用，无法删除' })
  const result = await db.run('DELETE FROM materials WHERE id = ?', [id])
  if (!result.affectedRows) return res.json({ code: 404, message: '物料不存在' })
  res.json({ code: 200, message: '删除成功' })
})

module.exports = router
