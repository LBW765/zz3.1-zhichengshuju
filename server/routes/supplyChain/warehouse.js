const express = require('express')
const { db } = require('../../db/index')
const { authMiddleware, roleMiddleware } = require('../../middleware/auth')
const { resolveBusinessCode } = require('../../services/codeGenerator')
const { getDuplicateMessageByRule } = require('../../utils/uniqueBusinessCode')

const router = express.Router()

router.use(authMiddleware)
router.use(roleMiddleware('administrator', 'admin', 'user'))

async function getActiveEmployeeById(employeeId) {
  if (!employeeId) return null
  return await db.get(
    `SELECT id, emp_no, name, phone
     FROM employees
     WHERE id = ? AND status != 'resigned'`
  , [Number(employeeId)]) || null
}

function getEmployeeDisplayName(employee) {
  if (!employee) return ''
  return String(employee.name || employee.emp_no || '').trim()
}

function warehouseToApi(row) {
  if (!row) return null
  return {
    id: row.id,
    warehouseCode: row.warehouse_code,
    warehouseName: row.warehouse_name,
    warehouseType: row.warehouse_type,
    manager: row.manager,
    phone: row.phone,
    address: row.address,
    area: row.area,
    temperatureReq: row.temperature_req,
    humidityReq: row.humidity_req,
    enableLocation: row.enable_location,
    status: row.status,
    remark: row.remark || '',
    areaCount: row.area_count || 0,
    locationCount: row.location_count || 0,
    createdBy: row.created_by,
    createdByName: row.created_by_name || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function areaToApi(row) {
  if (!row) return null
  return {
    id: row.id,
    warehouseId: row.warehouse_id,
    areaCode: row.area_code,
    areaName: row.area_name,
    areaType: row.area_type,
    sort: row.sort,
    remark: row.remark || '',
    locationCount: row.location_count || 0,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function locationToApi(row) {
  if (!row) return null
  return {
    id: row.id,
    areaId: row.area_id,
    locationCode: row.location_code,
    locationName: row.location_name,
    capacity: row.capacity,
    maxWeight: row.max_weight,
    sort: row.sort,
    status: row.status,
    remark: row.remark || '',
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

// ========== 仓库 CRUD ==========

router.get('/', async (req, res) => {
  const keyword = (req.query.keyword || '').trim()
  const status = req.query.status

  let conditions = ''
  const params = []

  if (keyword) {
    conditions += ' AND (w.warehouse_code LIKE ? OR w.warehouse_name LIKE ?)'
    const like = `%${keyword}%`
    params.push(like, like)
  }
  if (status !== undefined && status !== '') {
    conditions += ' AND w.status = ?'
    params.push(Number(status))
  }

  try {
    const rows = await db.all(
      `SELECT w.*, u.nick_name AS created_by_name,
              (SELECT COUNT(*) FROM warehouse_areas wa WHERE wa.warehouse_id = w.id) AS area_count,
              (SELECT COUNT(*) FROM warehouse_locations wl
               INNER JOIN warehouse_areas wa2 ON wa2.id = wl.area_id
               WHERE wa2.warehouse_id = w.id) AS location_count
       FROM warehouses w
       LEFT JOIN users u ON u.id = w.created_by
       WHERE 1=1${conditions}
       ORDER BY w.id ASC`
    , params)

    res.json({ code: 200, message: '获取成功', data: rows.map(warehouseToApi) })
  } catch (error) {
    console.error('获取仓库列表失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id)
  try {
    const row = await db.get(
      `SELECT w.*, u.nick_name AS created_by_name,
              (SELECT COUNT(*) FROM warehouse_areas wa WHERE wa.warehouse_id = w.id) AS area_count,
              (SELECT COUNT(*) FROM warehouse_locations wl
               INNER JOIN warehouse_areas wa2 ON wa2.id = wl.area_id
               WHERE wa2.warehouse_id = w.id) AS location_count
       FROM warehouses w
       LEFT JOIN users u ON u.id = w.created_by
       WHERE w.id = ?`
    , [id])

    if (!row) return res.json({ code: 404, message: '仓库不存在' })

    const areas = await db.all(
      `SELECT wa.*,
              (SELECT COUNT(*) FROM warehouse_locations wl WHERE wl.area_id = wa.id) AS location_count
       FROM warehouse_areas wa
       WHERE wa.warehouse_id = ?
       ORDER BY wa.sort ASC, wa.id ASC`
    , [id])

    const data = warehouseToApi(row)
    data.areas = areas.map(async a => {
      const areaData = areaToApi(a)
      areaData.locations = (await db.all(
        'SELECT * FROM warehouse_locations WHERE area_id = ? ORDER BY sort ASC, id ASC'
      , [a.id])).map(locationToApi)
      return areaData
    })

    res.json({ code: 200, message: '获取成功', data })
  } catch (error) {
    console.error('获取仓库详情失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

router.post('/', async (req, res) => {
  const b = req.body

  if (!b.warehouseName || !b.warehouseName.trim()) {
    return res.json({ code: 400, message: '仓库名称不能为空' })
  }
  const code = await resolveBusinessCode('warehouse', b.warehouseCode, 'CK')
  const duplicateMessage = getDuplicateMessageByRule(db, 'warehouse', code)
  if (duplicateMessage) return res.json({ code: 400, message: duplicateMessage })

  try {
    const managerEmployee = getActiveEmployeeById(b.managerUserId)
    const resolvedManager = managerEmployee ? getEmployeeDisplayName(managerEmployee) : (b.manager || '').trim()
    const resolvedPhone = managerEmployee ? String(managerEmployee.phone || '').trim() : (b.phone || '').trim()
    const result = await db.run(
      `INSERT INTO warehouses (warehouse_code, warehouse_name, warehouse_type, manager, phone, address, area, temperature_req, humidity_req, enable_location, status, remark, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    , [code,
      b.warehouseName.trim(),
      (b.warehouseType || '').trim(),
      resolvedManager,
      resolvedPhone,
      (b.address || '').trim(),
      b.area != null ? Number(b.area) : null,
      (b.temperatureReq || '').trim(),
      (b.humidityReq || '').trim(),
      b.enableLocation ? 1 : 0,
      b.status !== undefined ? Number(b.status) : 1,
      (b.remark || '').trim(),
      req.user.id])
    res.json({ code: 200, message: '添加成功', data: { id: Number(result.insertId) } })
  } catch (error) {
    console.error('添加仓库失败:', error.message)
    res.json({ code: 500, message: '添加失败' })
  }
})

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT * FROM warehouses WHERE id = ?', [id])
  if (!existing) return res.json({ code: 404, message: '仓库不存在' })

  const b = req.body

  try {
    const managerEmployee = b.managerUserId ? getActiveEmployeeById(b.managerUserId) : null
    const resolvedManager = managerEmployee
      ? getEmployeeDisplayName(managerEmployee)
      : (b.manager !== undefined ? String(b.manager).trim() : existing.manager)
    const resolvedPhone = managerEmployee
      ? String(managerEmployee.phone || '').trim()
      : (b.phone !== undefined ? String(b.phone).trim() : existing.phone)
    await db.run(
      `UPDATE warehouses SET warehouse_name=?, warehouse_type=?, manager=?, phone=?, address=?, area=?, temperature_req=?, humidity_req=?, enable_location=?, status=?, remark=?, updated_at=NOW() WHERE id=?`
    , [b.warehouseName !== undefined ? String(b.warehouseName).trim() : existing.warehouse_name,
      b.warehouseType !== undefined ? String(b.warehouseType).trim() : existing.warehouse_type,
      resolvedManager,
      resolvedPhone,
      b.address !== undefined ? String(b.address).trim() : existing.address,
      b.area !== undefined ? (b.area != null ? Number(b.area) : null) : existing.area,
      b.temperatureReq !== undefined ? String(b.temperatureReq).trim() : existing.temperature_req,
      b.humidityReq !== undefined ? String(b.humidityReq).trim() : existing.humidity_req,
      b.enableLocation !== undefined ? (b.enableLocation ? 1 : 0) : existing.enable_location,
      b.status !== undefined ? Number(b.status) : existing.status,
      b.remark !== undefined ? String(b.remark).trim() : existing.remark,
      id])
    res.json({ code: 200, message: '更新成功' })
  } catch (error) {
    console.error('更新仓库失败:', error.message)
    res.json({ code: 500, message: '更新失败' })
  }
})

router.put('/:id/status', async (req, res) => {
  const id = Number(req.params.id)
  const { status } = req.body
  const existing = await db.get('SELECT id FROM warehouses WHERE id = ?', [id])
  if (!existing) return res.json({ code: 404, message: '仓库不存在' })

  try {
    await db.run(
      `UPDATE warehouses SET status=?, updated_at=NOW() WHERE id=?`
    , [Number(status), id])
    res.json({ code: 200, message: '状态更新成功' })
  } catch (error) {
    console.error('更新仓库状态失败:', error.message)
    res.json({ code: 500, message: '状态更新失败' })
  }
})

// 批量导入仓库
router.post('/import', async (req, res) => {
  const { rows: list } = req.body
  if (!Array.isArray(list) || list.length === 0) {
    return res.json({ code: 400, message: '导入数据不能为空' })
  }

  const toBool = (v) => (v === 1 || v === '1' || v === '是' || v === true) ? 1 : 0
  const toNum = (v) => (v !== undefined && v !== null && v !== '') ? Number(v) : null

  const errors = []
  let success = 0

  

  try {
    await db.transaction(async (conn) => {
      for (let i = 0; i < list.length; i++) {
        const row = list[i]
        const rowNum = i + 1
        try {
          if (!row.warehouseCode || !String(row.warehouseCode).trim()) {
            errors.push(`第${rowNum}行：仓库编码不能为空`); continue
          }
          if (!row.warehouseName || !String(row.warehouseName).trim()) {
            errors.push(`第${rowNum}行：仓库名称不能为空`); continue
          }

          const code = String(row.warehouseCode).trim()
          const dup = await db.get('SELECT id FROM warehouses WHERE warehouse_code = ?', [code])
          if (dup) {
            errors.push(`第${rowNum}行：仓库编码"${code}"已存在`); continue
          }

          await db.run(
    `INSERT INTO warehouses (warehouse_code, warehouse_name, warehouse_type, manager, phone, address, area, temperature_req, humidity_req, enable_location, status, remark, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  , [code,
            String(row.warehouseName).trim(),
            (row.warehouseType || '').toString().trim(),
            (row.manager || '').toString().trim(),
            (row.phone || '').toString().trim(),
            (row.address || '').toString().trim(),
            toNum(row.area),
            (row.temperatureReq || '').toString().trim(),
            (row.humidityReq || '').toString().trim(),
            toBool(row.enableLocation),
            1,
            (row.remark || '').toString().trim(),
            req.user.id])
          success++
        } catch (e) {
          errors.push(`第${rowNum}行：${e.message}`)
        }
      }
    })

    res.json({
      code: 200,
      message: `导入完成：成功 ${success} 条${errors.length ? '，失败 ' + errors.length + ' 条' : ''}`,
      data: { total: list.length, success, failed: errors.length, errors }
    })
  } catch (error) {
    console.error('批量导入仓库失败:', error.message)
    res.json({ code: 500, message: '导入失败：' + error.message })
  }
})

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT id FROM warehouses WHERE id = ?', [id])
  if (!existing) return res.json({ code: 404, message: '仓库不存在' })

  const materialRef = await db.get('SELECT id FROM materials WHERE default_warehouse_id = ? LIMIT 1', [id])
  if (materialRef) {
    return res.json({ code: 400, message: '该仓库已被物料关联为默认仓库，无法删除' })
  }

  const areaCount = (await db.get('SELECT COUNT(*) as count FROM warehouse_areas WHERE warehouse_id = ?', [id])).count
  if (areaCount > 0) {
    return res.json({ code: 400, message: '该仓库下有库区，请先删除库区' })
  }

  try {
    await db.run('DELETE FROM warehouses WHERE id = ?', [id])
    res.json({ code: 200, message: '删除成功' })
  } catch (error) {
    console.error('删除仓库失败:', error.message)
    res.json({ code: 500, message: '删除失败' })
  }
})

// ========== 库区 CRUD ==========

router.get('/:warehouseId/areas', async (req, res) => {
  const warehouseId = Number(req.params.warehouseId)
  try {
    const rows = await db.all(
      `SELECT wa.*,
              (SELECT COUNT(*) FROM warehouse_locations wl WHERE wl.area_id = wa.id) AS location_count
       FROM warehouse_areas wa
       WHERE wa.warehouse_id = ?
       ORDER BY wa.sort ASC, wa.id ASC`
    , [warehouseId])
    res.json({ code: 200, message: '获取成功', data: rows.map(areaToApi) })
  } catch (error) {
    console.error('获取库区列表失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

router.post('/:warehouseId/areas', async (req, res) => {
  const warehouseId = Number(req.params.warehouseId)

  const warehouse = await db.get('SELECT enable_location FROM warehouses WHERE id = ?', [warehouseId])
  if (!warehouse) return res.json({ code: 404, message: '仓库不存在' })
  if (!warehouse.enable_location) return res.json({ code: 400, message: '该仓库未启用多层级管理' })

  const { areaCode, areaName, areaType, sort, remark } = req.body
  if (!areaName || !areaName.trim()) return res.json({ code: 400, message: '库区名称不能为空' })

  const code = await resolveBusinessCode('warehouse_area', areaCode, 'KQ')
  const duplicateMessage = getDuplicateMessageByRule(db, 'warehouse_area', code, {
    label: '该仓库下库区',
    scope: [{ field: 'warehouse_id', value: warehouseId }]
  })
  if (duplicateMessage) return res.json({ code: 400, message: duplicateMessage })

  try {
    const result = await db.run(
      `INSERT INTO warehouse_areas (warehouse_id, area_code, area_name, area_type, sort, remark, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    , [warehouseId,
      code,
      areaName.trim(),
      (areaType || '').trim(),
      sort !== undefined ? Number(sort) : 0,
      (remark || '').trim(),
      req.user.id])
    res.json({ code: 200, message: '添加成功', data: { id: Number(result.insertId) } })
  } catch (error) {
    console.error('添加库区失败:', error.message)
    res.json({ code: 500, message: '添加失败' })
  }
})

router.put('/:warehouseId/areas/:areaId', async (req, res) => {
  const areaId = Number(req.params.areaId)
  const existing = await db.get('SELECT * FROM warehouse_areas WHERE id = ?', [areaId])
  if (!existing) return res.json({ code: 404, message: '库区不存在' })

  const { areaName, areaType, sort, remark } = req.body

  try {
    await db.run(
      `UPDATE warehouse_areas SET area_name=?, area_type=?, sort=?, remark=?, updated_at=NOW() WHERE id=?`
    , [areaName !== undefined ? String(areaName).trim() : existing.area_name,
      areaType !== undefined ? String(areaType).trim() : existing.area_type,
      sort !== undefined ? Number(sort) : existing.sort,
      remark !== undefined ? String(remark).trim() : existing.remark,
      areaId])
    res.json({ code: 200, message: '更新成功' })
  } catch (error) {
    console.error('更新库区失败:', error.message)
    res.json({ code: 500, message: '更新失败' })
  }
})

router.delete('/:warehouseId/areas/:areaId', async (req, res) => {
  const areaId = Number(req.params.areaId)
  const existing = await db.get('SELECT id FROM warehouse_areas WHERE id = ?', [areaId])
  if (!existing) return res.json({ code: 404, message: '库区不存在' })

  const locCount = (await db.get('SELECT COUNT(*) as count FROM warehouse_locations WHERE area_id = ?', [areaId])).count
  if (locCount > 0) return res.json({ code: 400, message: '该库区下有库位，请先删除库位' })

  try {
    await db.run('DELETE FROM warehouse_areas WHERE id = ?', [areaId])
    res.json({ code: 200, message: '删除成功' })
  } catch (error) {
    console.error('删除库区失败:', error.message)
    res.json({ code: 500, message: '删除失败' })
  }
})

// ========== 库位 CRUD ==========

router.get('/areas/:areaId/locations', async (req, res) => {
  const areaId = Number(req.params.areaId)
  try {
    const rows = await db.all(
      'SELECT * FROM warehouse_locations WHERE area_id = ? ORDER BY sort ASC, id ASC'
    , [areaId])
    res.json({ code: 200, message: '获取成功', data: rows.map(locationToApi) })
  } catch (error) {
    console.error('获取库位列表失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

router.post('/areas/:areaId/locations', async (req, res) => {
  const areaId = Number(req.params.areaId)
  const area = await db.get('SELECT id FROM warehouse_areas WHERE id = ?', [areaId])
  if (!area) return res.json({ code: 404, message: '库区不存在' })

  const { locationCode, locationName, capacity, maxWeight, sort, status, remark } = req.body
  if (!locationName || !locationName.trim()) return res.json({ code: 400, message: '库位名称不能为空' })

  const code = await resolveBusinessCode('warehouse_location', locationCode, 'KW')
  const duplicateMessage = getDuplicateMessageByRule(db, 'warehouse_location', code, {
    label: '该库区下库位',
    scope: [{ field: 'area_id', value: areaId }]
  })
  if (duplicateMessage) return res.json({ code: 400, message: duplicateMessage })

  try {
    const result = await db.run(
      `INSERT INTO warehouse_locations (area_id, location_code, location_name, capacity, max_weight, sort, status, remark, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    , [areaId,
      code,
      locationName.trim(),
      capacity != null ? Number(capacity) : null,
      maxWeight != null ? Number(maxWeight) : null,
      sort !== undefined ? Number(sort) : 0,
      status !== undefined ? Number(status) : 1,
      (remark || '').trim(),
      req.user.id])
    res.json({ code: 200, message: '添加成功', data: { id: Number(result.insertId) } })
  } catch (error) {
    console.error('添加库位失败:', error.message)
    res.json({ code: 500, message: '添加失败' })
  }
})

router.put('/areas/:areaId/locations/:locationId', async (req, res) => {
  const locationId = Number(req.params.locationId)
  const existing = await db.get('SELECT * FROM warehouse_locations WHERE id = ?', [locationId])
  if (!existing) return res.json({ code: 404, message: '库位不存在' })

  const { locationName, capacity, maxWeight, sort, status, remark } = req.body

  try {
    await db.run(
      `UPDATE warehouse_locations SET location_name=?, capacity=?, max_weight=?, sort=?, status=?, remark=?, updated_at=NOW() WHERE id=?`
    , [locationName !== undefined ? String(locationName).trim() : existing.location_name,
      capacity !== undefined ? (capacity != null ? Number(capacity) : null) : existing.capacity,
      maxWeight !== undefined ? (maxWeight != null ? Number(maxWeight) : null) : existing.max_weight,
      sort !== undefined ? Number(sort) : existing.sort,
      status !== undefined ? Number(status) : existing.status,
      remark !== undefined ? String(remark).trim() : existing.remark,
      locationId])
    res.json({ code: 200, message: '更新成功' })
  } catch (error) {
    console.error('更新库位失败:', error.message)
    res.json({ code: 500, message: '更新失败' })
  }
})

router.delete('/areas/:areaId/locations/:locationId', async (req, res) => {
  const locationId = Number(req.params.locationId)
  const existing = await db.get('SELECT id FROM warehouse_locations WHERE id = ?', [locationId])
  if (!existing) return res.json({ code: 404, message: '库位不存在' })

  try {
    await db.run('DELETE FROM warehouse_locations WHERE id = ?', [locationId])
    res.json({ code: 200, message: '删除成功' })
  } catch (error) {
    console.error('删除库位失败:', error.message)
    res.json({ code: 500, message: '删除失败' })
  }
})

module.exports = router
