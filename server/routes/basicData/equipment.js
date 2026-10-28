const express = require('express')
const { db } = require('../../db/index')
const { authMiddleware, roleMiddleware } = require('../../middleware/auth')
const { resolveBusinessCode } = require('../../services/codeGenerator')
const { getDuplicateMessageByRule } = require('../../utils/uniqueBusinessCode')

const router = express.Router()

router.use(authMiddleware)
router.use(roleMiddleware('administrator', 'admin', 'user'))

function toApi(row) {
  if (!row) return null
  return {
    id: row.id,
    equipmentCode: row.equipment_code,
    equipmentName: row.equipment_name,
    categoryId: row.category_id,
    categoryName: row.category_name || '',
    model: row.model || '',
    manufacturer: row.manufacturer || '',
    serialNo: row.serial_no || '',
    supplierId: row.supplier_id,
    supplierName: row.supplier_name || '',
    workshopId: row.workshop_id,
    workshopName: row.workshop_name || '',
    lineId: row.line_id,
    lineName: row.line_name || '',
    originalValue: row.original_value,
    residualValue: row.residual_value,
    depreciationMethod: row.depreciation_method || '',
    depreciationYears: row.depreciation_years,
    annualDepreciation: row.annual_depreciation,
    accumulatedDepreciation: row.accumulated_depreciation,
    netBookValue: row.net_book_value,
    purchaseDate: row.purchase_date || '',
    commissioningDate: row.commissioning_date || '',
    warrantyDate: row.warranty_date || '',
    serviceLife: row.service_life,
    ratedPower: row.rated_power || '',
    precisionLevel: row.precision_level || '',
    dimensions: row.dimensions || '',
    weightKg: row.weight_kg,
    maintenanceCycle: row.maintenance_cycle,
    lastMaintenanceDate: row.last_maintenance_date || '',
    nextMaintenanceDate: row.next_maintenance_date || '',
    status: row.status,
    remark: row.remark || '',
    createdBy: row.created_by,
    createdByName: row.created_by_name || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function calcDepreciation(originalValue, residualValue, method, years, commissioningDate) {
  if (!originalValue || !method || !years || !commissioningDate) {
    return { annual: null, accumulated: null, netBook: null }
  }
  const ov = Number(originalValue)
  const rv = Number(residualValue) || 0
  const y = Number(years)
  if (y <= 0) return { annual: null, accumulated: null, netBook: null }

  const start = new Date(commissioningDate)
  const now = new Date()
  const usedYears = Math.max(0, (now.getFullYear() - start.getFullYear()) + (now.getMonth() - start.getMonth()) / 12)
  const fullYearsUsed = Math.min(Math.floor(usedYears), y)

  let annual = 0
  let accumulated = 0

  if (method === '直线法') {
    annual = (ov - rv) / y
    accumulated = Math.min(annual * fullYearsUsed, ov - rv)
  } else if (method === '双倍余额递减法') {
    let nbv = ov
    for (let i = 0; i < fullYearsUsed && i < y; i++) {
      const dep = nbv * (2 / y)
      accumulated += dep
      nbv -= dep
    }
    annual = fullYearsUsed < y ? (nbv > rv ? nbv * (2 / y) : 0) : 0
    accumulated = Math.min(accumulated, ov - rv)
  } else if (method === '年数总和法') {
    const sumOfYears = y * (y + 1) / 2
    for (let i = 0; i < fullYearsUsed && i < y; i++) {
      accumulated += (ov - rv) * (y - i) / sumOfYears
    }
    const currentYear = Math.min(fullYearsUsed, y - 1)
    annual = (ov - rv) * (y - currentYear) / sumOfYears
    accumulated = Math.min(accumulated, ov - rv)
  }

  const netBook = Math.max(rv, ov - accumulated)

  return {
    annual: Math.round(annual * 100) / 100,
    accumulated: Math.round(accumulated * 100) / 100,
    netBook: Math.round(netBook * 100) / 100
  }
}

function calcNextMaintenanceDate(lastDate, cycleDays) {
  if (!lastDate || !cycleDays) return null
  const d = new Date(lastDate)
  d.setDate(d.getDate() + Number(cycleDays))
  return d.toISOString().split('T')[0]
}

async function getDescendantCategoryIds(parentId) {
  const ids = [parentId]
  const children = await db.all('SELECT id FROM equipment_categories WHERE parent_id = ?', [parentId])
  for (const child of children) {
    ids.push(...getDescendantCategoryIds(child.id))
  }
  return ids
}

const JOIN_SQL = `
  FROM equipments e
  LEFT JOIN users u ON u.id = e.created_by
  LEFT JOIN equipment_categories ec ON ec.id = e.category_id
  LEFT JOIN suppliers sup ON sup.id = e.supplier_id
  LEFT JOIN workshops w ON w.id = e.workshop_id
  LEFT JOIN production_lines pl ON pl.id = e.line_id`

const SELECT_SQL = `SELECT e.*, u.nick_name AS created_by_name, ec.category_name,
  sup.supplier_name, w.workshop_name, pl.line_name`

router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 10))
  const offset = (page - 1) * pageSize
  const keyword = (req.query.keyword || '').trim()
  const categoryId = req.query.categoryId
  const status = req.query.status

  let conditions = ''
  const params = []

  if (keyword) {
    conditions += ' AND (e.equipment_code LIKE ? OR e.equipment_name LIKE ? OR e.model LIKE ?)'
    const like = `%${keyword}%`
    params.push(like, like, like)
  }
  if (categoryId) {
    const catIds = getDescendantCategoryIds(Number(categoryId))
    conditions += ` AND e.category_id IN (${catIds.map(() => '?').join(',')})`
    params.push(...catIds)
  }
  if (status !== undefined && status !== '') {
    conditions += ' AND e.status = ?'
    params.push(Number(status))
  }

  try {
    const total = (await db.get(
      `SELECT COUNT(*) as total ${JOIN_SQL} WHERE 1=1${conditions}`
    , params)).total

    const rows = await db.all(
      `${SELECT_SQL} ${JOIN_SQL} WHERE 1=1${conditions} ORDER BY e.id DESC LIMIT ? OFFSET ?`
    , [...params, pageSize, offset])

    res.json({
      code: 200,
      message: '获取成功',
      data: { list: rows.map(toApi), total, page, pageSize }
    })
  } catch (error) {
    console.error('获取设备列表失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id)
  try {
    const row = await db.get(
      `${SELECT_SQL} ${JOIN_SQL} WHERE e.id = ?`
    , [id])

    if (!row) return res.json({ code: 404, message: '设备不存在' })
    res.json({ code: 200, message: '获取成功', data: toApi(row) })
  } catch (error) {
    console.error('获取设备详情失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

router.post('/', async (req, res) => {
  const b = req.body

  if (!b.equipmentName || !b.equipmentName.trim()) {
    return res.json({ code: 400, message: '设备名称不能为空' })
  }

  const code = await resolveBusinessCode('equipment', b.equipmentCode, 'SB')
  const duplicateMessage = getDuplicateMessageByRule(db, 'equipment', code)
  if (duplicateMessage) return res.json({ code: 400, message: duplicateMessage })

  const dep = calcDepreciation(b.originalValue, b.residualValue, b.depreciationMethod, b.depreciationYears, b.commissioningDate)
  const nextMaint = calcNextMaintenanceDate(b.lastMaintenanceDate, b.maintenanceCycle)

  try {
    const result = await db.run(
      `INSERT INTO equipments (equipment_code, equipment_name, category_id, model, manufacturer, serial_no, supplier_id, workshop_id, line_id,
        original_value, residual_value, depreciation_method, depreciation_years, annual_depreciation, accumulated_depreciation, net_book_value,
        purchase_date, commissioning_date, warranty_date, service_life,
        rated_power, precision_level, dimensions, weight_kg,
        maintenance_cycle, last_maintenance_date, next_maintenance_date,
        status, remark, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    , [code,
      b.equipmentName.trim(),
      b.categoryId || null,
      (b.model || '').trim(),
      (b.manufacturer || '').trim(),
      (b.serialNo || '').trim(),
      b.supplierId || null,
      b.workshopId || null,
      b.lineId || null,
      b.originalValue != null ? Number(b.originalValue) : null,
      b.residualValue != null ? Number(b.residualValue) : null,
      (b.depreciationMethod || '').trim() || null,
      b.depreciationYears != null ? Number(b.depreciationYears) : null,
      dep.annual,
      dep.accumulated,
      dep.netBook,
      (b.purchaseDate || '').trim() || null,
      (b.commissioningDate || '').trim() || null,
      (b.warrantyDate || '').trim() || null,
      b.serviceLife != null ? Number(b.serviceLife) : null,
      (b.ratedPower || '').trim(),
      (b.precisionLevel || '').trim(),
      (b.dimensions || '').trim(),
      b.weightKg != null ? Number(b.weightKg) : null,
      b.maintenanceCycle != null ? Number(b.maintenanceCycle) : null,
      (b.lastMaintenanceDate || '').trim() || null,
      nextMaint,
      b.status !== undefined ? Number(b.status) : 1,
      (b.remark || '').trim(),
      req.user.id])
    res.json({ code: 200, message: '添加成功', data: { id: Number(result.insertId), equipmentCode: code } })
  } catch (error) {
    console.error('添加设备失败:', error.message)
    res.json({ code: 500, message: '添加失败' })
  }
})

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT * FROM equipments WHERE id = ?', [id])
  if (!existing) return res.json({ code: 404, message: '设备不存在' })

  const b = req.body

  const ov = b.originalValue !== undefined ? b.originalValue : existing.original_value
  const rv = b.residualValue !== undefined ? b.residualValue : existing.residual_value
  const dm = b.depreciationMethod !== undefined ? b.depreciationMethod : existing.depreciation_method
  const dy = b.depreciationYears !== undefined ? b.depreciationYears : existing.depreciation_years
  const cd = b.commissioningDate !== undefined ? b.commissioningDate : existing.commissioning_date

  const dep = calcDepreciation(ov, rv, dm, dy, cd)

  const lmd = b.lastMaintenanceDate !== undefined ? b.lastMaintenanceDate : existing.last_maintenance_date
  const mc = b.maintenanceCycle !== undefined ? b.maintenanceCycle : existing.maintenance_cycle
  const nextMaint = calcNextMaintenanceDate(lmd, mc)

  try {
    await db.run(
      `UPDATE equipments SET equipment_name=?, category_id=?, model=?, manufacturer=?, serial_no=?, supplier_id=?, workshop_id=?, line_id=?,
        original_value=?, residual_value=?, depreciation_method=?, depreciation_years=?, annual_depreciation=?, accumulated_depreciation=?, net_book_value=?,
        purchase_date=?, commissioning_date=?, warranty_date=?, service_life=?,
        rated_power=?, precision_level=?, dimensions=?, weight_kg=?,
        maintenance_cycle=?, last_maintenance_date=?, next_maintenance_date=?,
        status=?, remark=?, updated_at=NOW() WHERE id=?`
    , [b.equipmentName !== undefined ? String(b.equipmentName).trim() : existing.equipment_name,
      b.categoryId !== undefined ? (b.categoryId || null) : existing.category_id,
      b.model !== undefined ? String(b.model).trim() : existing.model,
      b.manufacturer !== undefined ? String(b.manufacturer).trim() : existing.manufacturer,
      b.serialNo !== undefined ? String(b.serialNo).trim() : existing.serial_no,
      b.supplierId !== undefined ? (b.supplierId || null) : existing.supplier_id,
      b.workshopId !== undefined ? (b.workshopId || null) : existing.workshop_id,
      b.lineId !== undefined ? (b.lineId || null) : existing.line_id,
      ov != null ? Number(ov) : null,
      rv != null ? Number(rv) : null,
      dm ? String(dm).trim() : null,
      dy != null ? Number(dy) : null,
      dep.annual,
      dep.accumulated,
      dep.netBook,
      b.purchaseDate !== undefined ? (b.purchaseDate || null) : existing.purchase_date,
      cd ? String(cd).trim() : null,
      b.warrantyDate !== undefined ? (b.warrantyDate || null) : existing.warranty_date,
      b.serviceLife !== undefined ? (b.serviceLife != null ? Number(b.serviceLife) : null) : existing.service_life,
      b.ratedPower !== undefined ? String(b.ratedPower).trim() : existing.rated_power,
      b.precisionLevel !== undefined ? String(b.precisionLevel).trim() : existing.precision_level,
      b.dimensions !== undefined ? String(b.dimensions).trim() : existing.dimensions,
      b.weightKg !== undefined ? (b.weightKg != null ? Number(b.weightKg) : null) : existing.weight_kg,
      mc != null ? Number(mc) : null,
      lmd || null,
      nextMaint,
      b.status !== undefined ? Number(b.status) : existing.status,
      b.remark !== undefined ? String(b.remark).trim() : existing.remark,
      id])
    res.json({ code: 200, message: '更新成功' })
  } catch (error) {
    console.error('更新设备失败:', error.message)
    res.json({ code: 500, message: '更新失败' })
  }
})

router.put('/:id/status', async (req, res) => {
  const id = Number(req.params.id)
  const { status } = req.body
  const existing = await db.get('SELECT id FROM equipments WHERE id = ?', [id])
  if (!existing) return res.json({ code: 404, message: '设备不存在' })

  try {
    await db.run(
      `UPDATE equipments SET status=?, updated_at=NOW() WHERE id=?`
    , [Number(status), id])
    res.json({ code: 200, message: '状态更新成功' })
  } catch (error) {
    console.error('更新设备状态失败:', error.message)
    res.json({ code: 500, message: '状态更新失败' })
  }
})

router.post('/import', async (req, res) => {
  const { rows } = req.body
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.json({ code: 400, message: '导入数据不能为空' })
  }

  const errors = []
  let success = 0

  // Build name → id caches
  const categoryCache = {}
  const allCategories = await db.all('SELECT id, category_name FROM equipment_categories')
  for (const cat of allCategories) {
    categoryCache[cat.category_name] = cat.id
  }

  const workshopCache = {}
  const allWorkshops = await db.all('SELECT id, workshop_name FROM workshops')
  for (const w of allWorkshops) {
    workshopCache[w.workshop_name] = w.id
  }

  const supplierCache = {}
  const allSuppliers = await db.all('SELECT id, supplier_name FROM suppliers')
  for (const s of allSuppliers) {
    supplierCache[s.supplier_name] = s.id
  }

  
  

  await db.transaction(async (conn) => {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      const rowIndex = i + 1
      try {
        const code = (r.equipmentCode || '').trim()
        const name = (r.equipmentName || '').trim()

        if (!code) { errors.push(`第${rowIndex}行：设备编码不能为空`); continue }
        if (!name) { errors.push(`第${rowIndex}行：设备名称不能为空`); continue }

        if (await db.get('SELECT id FROM equipments WHERE equipment_code = ?', [code])) {
          errors.push(`第${rowIndex}行：设备编码 ${code} 已存在`)
          continue
        }

        // Resolve category
        let categoryId = r.categoryId || null
        if (!categoryId && r.categoryName) {
          categoryId = categoryCache[r.categoryName.trim()] || null
          if (!categoryId) {
            errors.push(`第${rowIndex}行：设备分类 "${r.categoryName}" 不存在`)
            continue
          }
        }

        // Resolve workshop
        let workshopId = r.workshopId || null
        if (!workshopId && r.workshopName) {
          workshopId = workshopCache[r.workshopName.trim()] || null
          if (!workshopId) {
            errors.push(`第${rowIndex}行：车间 "${r.workshopName}" 不存在`)
            continue
          }
        }

        // Resolve supplier
        let supplierId = r.supplierId || null
        if (!supplierId && r.supplierName) {
          supplierId = supplierCache[r.supplierName.trim()] || null
          if (!supplierId) {
            errors.push(`第${rowIndex}行：供应商 "${r.supplierName}" 不存在`)
            continue
          }
        }

        const dep = calcDepreciation(r.originalValue, r.residualValue, r.depreciationMethod, r.depreciationYears, r.commissioningDate)
        const nextMaint = calcNextMaintenanceDate(r.lastMaintenanceDate, r.maintenanceCycle)

        await db.run(
    `INSERT INTO equipments (equipment_code, equipment_name, category_id, model, manufacturer, serial_no, supplier_id, workshop_id, line_id,
      original_value, residual_value, depreciation_method, depreciation_years, annual_depreciation, accumulated_depreciation, net_book_value,
      purchase_date, commissioning_date, warranty_date, service_life,
      rated_power, precision_level, dimensions, weight_kg,
      maintenance_cycle, last_maintenance_date, next_maintenance_date,
      status, remark, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  , [code,
          name,
          categoryId,
          (r.model || '').trim(),
          (r.manufacturer || '').trim(),
          (r.serialNo || '').trim(),
          supplierId,
          workshopId,
          r.lineId || null,
          r.originalValue != null ? Number(r.originalValue) : null,
          r.residualValue != null ? Number(r.residualValue) : null,
          (r.depreciationMethod || '').trim() || null,
          r.depreciationYears != null ? Number(r.depreciationYears) : null,
          dep.annual,
          dep.accumulated,
          dep.netBook,
          (r.purchaseDate || '').trim() || null,
          (r.commissioningDate || '').trim() || null,
          (r.warrantyDate || '').trim() || null,
          r.serviceLife != null ? Number(r.serviceLife) : null,
          (r.ratedPower || '').trim(),
          (r.precisionLevel || '').trim(),
          (r.dimensions || '').trim(),
          r.weightKg != null ? Number(r.weightKg) : null,
          r.maintenanceCycle != null ? Number(r.maintenanceCycle) : null,
          (r.lastMaintenanceDate || '').trim() || null,
          nextMaint,
          r.status !== undefined ? Number(r.status) : 1,
          (r.remark || '').trim(),
          req.user.id])
        success++
      } catch (err) {
        errors.push(`第${rowIndex}行：${err.message}`)
      }
    }
  })

  try {
    runImport()
    res.json({
      code: 200,
      message: '导入完成',
      data: { total: rows.length, success, failed: rows.length - success, errors }
    })
  } catch (error) {
    console.error('导入设备失败:', error.message)
    res.json({ code: 500, message: '导入失败：' + error.message })
  }
})

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT id FROM equipments WHERE id = ?', [id])
  if (!existing) return res.json({ code: 404, message: '设备不存在' })

  try {
    await db.run('DELETE FROM equipments WHERE id = ?', [id])
    res.json({ code: 200, message: '删除成功' })
  } catch (error) {
    console.error('删除设备失败:', error.message)
    res.json({ code: 500, message: '删除失败' })
  }
})

module.exports = router
