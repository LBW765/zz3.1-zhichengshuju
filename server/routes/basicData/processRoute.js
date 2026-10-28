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
    routeCode: row.route_code,
    routeName: row.route_name,
    routeType: row.route_type || '',
    version: row.version || 'V1.0',
    description: row.description || '',
    status: row.status,
    itemCount: row.item_count || 0,
    materialCount: row.material_count || 0,
    createdBy: row.created_by,
    createdByName: row.created_by_name || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

router.get('/', async (req, res) => {
  const keyword = (req.query.keyword || '').trim()
  const status = req.query.status

  let conditions = ''
  const params = []

  if (keyword) {
    conditions += ' AND (r.route_code LIKE ? OR r.route_name LIKE ?)'
    params.push(`%${keyword}%`, `%${keyword}%`)
  }
  if (status !== undefined && status !== '') {
    conditions += ' AND r.status = ?'
    params.push(Number(status))
  }

  try {
    const rows = await db.all(
      `SELECT r.*,
              usr.nick_name AS created_by_name,
              (SELECT COUNT(*) FROM process_route_items WHERE route_id = r.id) AS item_count,
              (SELECT COUNT(*) FROM process_route_materials WHERE route_id = r.id) AS material_count
       FROM process_routes r
       LEFT JOIN users usr ON usr.id = r.created_by
       WHERE 1=1${conditions}
       ORDER BY r.id DESC`
    , params)

    res.json({ code: 200, message: '获取成功', data: { list: rows.map(toApi) } })
  } catch (error) {
    console.error('获取工艺路线列表失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id)
  try {
    const row = await db.get(
      `SELECT r.*, usr.nick_name AS created_by_name,
              (SELECT COUNT(*) FROM process_route_items WHERE route_id = r.id) AS item_count,
              (SELECT COUNT(*) FROM process_route_materials WHERE route_id = r.id) AS material_count
       FROM process_routes r
       LEFT JOIN users usr ON usr.id = r.created_by
       WHERE r.id = ?`
    , [id])
    if (!row) return res.json({ code: 404, message: '工艺路线不存在' })

    const items = await db.all(
      `SELECT ri.*, p.process_code, p.process_name, p.process_type, p.is_key_process,
              p.equipment_type, p.skill_level, p.standard_time
       FROM process_route_items ri
       LEFT JOIN processes p ON p.id = ri.process_id
       WHERE ri.route_id = ?
       ORDER BY ri.seq ASC`
    , [id])

    const itemsWithAttachments = items.map(async item => {
      const attachments = await db.all(
        'SELECT id, file_name, file_path, file_size, created_at FROM process_attachments WHERE process_id = ?'
      , [item.process_id])
      return {
        id: item.id,
        routeId: item.route_id,
        processId: item.process_id,
        seq: item.seq,
        remark: item.remark || '',
        processCode: item.process_code || '',
        processName: item.process_name || '',
        processType: item.process_type || '',
        isKeyProcess: item.is_key_process || 0,
        equipmentType: item.equipment_type || '',
        skillLevel: item.skill_level || '',
        standardTime: item.standard_time,
        attachments: attachments.map(async a => ({
          id: a.id, fileName: a.file_name, filePath: a.file_path, fileSize: a.file_size, createdAt: a.created_at
        }))
      }
    })

    const materials = await db.all(
      `SELECT rm.id, rm.material_id, m.material_code, m.material_name, m.spec, m.material_type
       FROM process_route_materials rm
       LEFT JOIN materials m ON m.id = rm.material_id
       WHERE rm.route_id = ?
       ORDER BY rm.id ASC`
    , [id])

    const data = toApi(row)
    data.items = itemsWithAttachments
    data.materials = materials.map(async m => ({
      id: m.id,
      materialId: m.material_id,
      materialCode: m.material_code || '',
      materialName: m.material_name || '',
      spec: m.spec || '',
      materialType: m.material_type || ''
    }))

    res.json({ code: 200, message: '获取成功', data })
  } catch (error) {
    console.error('获取工艺路线详情失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

router.post('/', async (req, res) => {
  const { routeCode, routeName, routeType, version, description, status, items, materials } = req.body

  if (!routeName || !routeName.trim()) return res.json({ code: 400, message: '路线名称不能为空' })

  const code = await resolveBusinessCode('process_route', routeCode, 'GYLX')
  const duplicateMessage = getDuplicateMessageByRule(db, 'process_route', code)
  if (duplicateMessage) return res.json({ code: 400, message: duplicateMessage })

  try {
    let routeId
    await db.transaction(async (conn) => {
      const result = await db.run(
        `INSERT INTO process_routes (route_code, route_name, route_type, version, description, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      , [code,
        routeName.trim(),
        (routeType || '').trim(),
        (version || 'V1.0').trim(),
        (description || '').trim(),
        status !== undefined ? Number(status) : 1,
        req.user.id])
      routeId = Number(result.insertId)

      if (Array.isArray(items) && items.length > 0) {
        
        for (const item of items) {
          await db.run(
          'INSERT INTO process_route_items (route_id, process_id, seq, remark) VALUES (?, ?, ?, ?)'
        , [routeId, Number(item.processId), Number(item.seq), (item.remark || '').trim()])
        }
      }

      if (Array.isArray(materials) && materials.length > 0) {
        
        for (const mat of materials) {
          await db.run(
          'INSERT INTO process_route_materials (route_id, material_id) VALUES (?, ?)'
        , [routeId, Number(mat.materialId || mat)])
        }
      }
    })

    res.json({ code: 200, message: '添加成功', data: { id: routeId } })
  } catch (error) {
    console.error('添加工艺路线失败:', error.message)
    res.json({ code: 500, message: '添加失败' })
  }
})

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT * FROM process_routes WHERE id = ?', [id])
  if (!existing) return res.json({ code: 404, message: '工艺路线不存在' })

  const { routeCode, routeName, routeType, version, description, status, items, materials } = req.body

  if (routeCode && routeCode.trim() !== existing.route_code) {
    const duplicateMessage = getDuplicateMessageByRule(db, 'process_route', routeCode.trim(), { excludeId: id })
    if (duplicateMessage) return res.json({ code: 400, message: duplicateMessage })
  }

  try {
    await db.transaction(async (conn) => {
      await db.run(
        `UPDATE process_routes SET route_code=?, route_name=?, route_type=?, version=?, description=?, status=?,
          updated_at=NOW() WHERE id=?`
      , [routeCode !== undefined ? String(routeCode).trim() : existing.route_code,
        routeName !== undefined ? String(routeName).trim() : existing.route_name,
        routeType !== undefined ? String(routeType).trim() : existing.route_type,
        version !== undefined ? String(version).trim() : existing.version,
        description !== undefined ? String(description).trim() : existing.description,
        status !== undefined ? Number(status) : existing.status,
        id])

      if (Array.isArray(items)) {
        await db.run('DELETE FROM process_route_items WHERE route_id = ?', [id])
        for (const item of items) {
          await db.run(
          'INSERT INTO process_route_items (route_id, process_id, seq, remark) VALUES (?, ?, ?, ?)'
        , [id, Number(item.processId), Number(item.seq), (item.remark || '').trim()])
        }
      }

      if (Array.isArray(materials)) {
        await db.run('DELETE FROM process_route_materials WHERE route_id = ?', [id])
        for (const mat of materials) {
          await db.run(
          'INSERT INTO process_route_materials (route_id, material_id) VALUES (?, ?)'
        , [id, Number(mat.materialId || mat)])
        }
      }
    })

    res.json({ code: 200, message: '更新成功' })
  } catch (error) {
    console.error('更新工艺路线失败:', error.message)
    res.json({ code: 500, message: '更新失败' })
  }
})

router.put('/:id/status', async (req, res) => {
  const id = Number(req.params.id)
  const { status } = req.body
  const existing = await db.get('SELECT id FROM process_routes WHERE id = ?', [id])
  if (!existing) return res.json({ code: 404, message: '工艺路线不存在' })

  try {
    await db.run(
      `UPDATE process_routes SET status=?, updated_at=NOW() WHERE id=?`
    , [Number(status), id])
    res.json({ code: 200, message: '状态更新成功' })
  } catch (error) {
    console.error('更新工艺路线状态失败:', error.message)
    res.json({ code: 500, message: '状态更新失败' })
  }
})

// 批量导入（仅导入路线头信息，工序步骤通过界面添加）
router.post('/import', async (req, res) => {
  const { rows: list } = req.body
  if (!Array.isArray(list) || list.length === 0) {
    return res.json({ code: 400, message: '????????' })
  }

  const errors = []
  let success = 0

  const cell = async (row, key, label) => {
    const value = row?.[key] ?? row?.[label] ?? ''
    return String(value ?? '').trim()
  }

  

  try {
    await db.transaction(async (conn) => {
      for (let i = 0; i < list.length; i++) {
        const row = list[i]
        const rowNum = row.__rowNo || i + 2
        const routeCode = cell(row, 'routeCode', '????')
        const routeName = cell(row, 'routeName', '????')

        try {
          if (!routeCode) {
            errors.push({ row: rowNum, field: 'routeCode', label: '????', message: '????' })
            continue
          }
          if (!routeName) {
            errors.push({ row: rowNum, field: 'routeName', label: '????', message: '????' })
            continue
          }

          const dup = await db.get('SELECT id FROM process_routes WHERE route_code = ?', [routeCode])
          if (dup) {
            errors.push({ row: rowNum, field: 'routeCode', label: '????', message: `?????${routeCode}????` })
            continue
          }

          await db.run(
    `INSERT INTO process_routes (route_code, route_name, route_type, version, description, status, remark, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  , [routeCode,
            routeName,
            cell(row, 'routeType', '????'),
            cell(row, 'version', '??') || 'V1.0',
            cell(row, 'description', '??'),
            1,
            cell(row, 'remark', '??'),
            req.user.id])
          success++
        } catch (e) {
          errors.push({ row: rowNum, field: '-', label: '-', message: e.message })
        }
      }
    })

    res.json({
      code: 200,
      message: `??????? ${success} ?${errors.length ? '??? ' + errors.length + ' ?' : ''}`,
      data: { total: list.length, success, failed: errors.length, errors }
    })
  } catch (error) {
    console.error('??????????:', error.message)
    res.json({ code: 500, message: '?????' + error.message })
  }
})

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT id FROM process_routes WHERE id = ?', [id])
  if (!existing) return res.json({ code: 404, message: '工艺路线不存在' })

  try {
    await db.run('DELETE FROM process_routes WHERE id = ?', [id])
    res.json({ code: 200, message: '删除成功' })
  } catch (error) {
    console.error('删除工艺路线失败:', error.message)
    res.json({ code: 500, message: '删除失败' })
  }
})

module.exports = router
