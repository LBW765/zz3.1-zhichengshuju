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
    processCode: row.process_code,
    processName: row.process_name,
    processType: row.process_type || (Number(row.is_key_process) === 1 ? '关键工序' : '普通工序'),
    isKeyProcess: row.is_key_process,
    isInspection: row.is_inspection,
    isForceInspection: row.is_force_inspection,
    equipmentType: row.equipment_type || '',
    skillLevel: row.skill_level || '',
    standardTime: row.standard_time,
    description: row.description || '',
    status: row.status,
    remark: row.remark || '',
    attachmentCount: row.attachment_count || 0,
    createdBy: row.created_by,
    createdByName: row.created_by_name || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function normalizeProcessType(isKeyProcess, fallback = '') {
  if (isKeyProcess !== undefined && isKeyProcess !== null && isKeyProcess !== '') {
    return Number(isKeyProcess) === 1 ? '关键工序' : '普通工序'
  }
  const text = String(fallback || '').trim()
  return text || '普通工序'
}

function toBoolFlag(value) {
  return value === 1 || value === '1' || value === '是' || value === true ? 1 : 0
}

function resolveKeyProcessFlag(row) {
  if (row.isKeyProcess !== undefined && row.isKeyProcess !== null && row.isKeyProcess !== '') {
    return toBoolFlag(row.isKeyProcess)
  }
  return String(row.processType || '').trim() === '关键工序' ? 1 : 0
}

function attachmentToApi(row) {
  return {
    id: row.id,
    processId: row.process_id,
    fileName: row.file_name,
    filePath: row.file_path,
    fileSize: row.file_size,
    createdBy: row.created_by,
    createdAt: row.created_at
  }
}

router.get('/', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 10))
  const keyword = (req.query.keyword || '').trim()
  const processType = (req.query.processType || '').trim()
  const isKeyProcess = req.query.isKeyProcess
  const status = req.query.status

  let conditions = ''
  const params = []

  if (keyword) {
    conditions += ' AND (p.process_code LIKE ? OR p.process_name LIKE ?)'
    params.push(`%${keyword}%`, `%${keyword}%`)
  }
  if (processType) {
    conditions += ' AND p.process_type = ?'
    params.push(processType)
  }
  if (isKeyProcess !== undefined && isKeyProcess !== '') {
    conditions += ' AND p.is_key_process = ?'
    params.push(toBoolFlag(isKeyProcess))
  }
  if (status !== undefined && status !== '') {
    conditions += ' AND p.status = ?'
    params.push(Number(status))
  }

  try {
    const countRow = await db.get(
      `SELECT COUNT(*) as total FROM processes p WHERE 1=1${conditions}`
    , params)

    const rows = await db.all(
      `SELECT p.*,
              usr.nick_name AS created_by_name,
              (SELECT COUNT(*) FROM process_attachments WHERE process_id = p.id) AS attachment_count
       FROM processes p
       LEFT JOIN users usr ON usr.id = p.created_by
       WHERE 1=1${conditions}
       ORDER BY p.id DESC
       LIMIT ? OFFSET ?`
    , [...params, pageSize, (page - 1) * pageSize])

    res.json({
      code: 200,
      message: '获取成功',
      data: { list: rows.map(toApi), total: countRow.total, page, pageSize }
    })
  } catch (error) {
    console.error('获取工序列表失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id)
  try {
    const row = await db.get(
      `SELECT p.*, usr.nick_name AS created_by_name,
              (SELECT COUNT(*) FROM process_attachments WHERE process_id = p.id) AS attachment_count
       FROM processes p
       LEFT JOIN users usr ON usr.id = p.created_by
       WHERE p.id = ?`
    , [id])
    if (!row) return res.json({ code: 404, message: '工序不存在' })

    const attachments = await db.all('SELECT * FROM process_attachments WHERE process_id = ? ORDER BY id ASC', [id])

    const data = toApi(row)
    data.attachments = attachments.map(attachmentToApi)
    res.json({ code: 200, message: '获取成功', data })
  } catch (error) {
    console.error('获取工序详情失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

router.post('/', async (req, res) => {
  const { processCode, processName, processType, isKeyProcess, isInspection,
    isForceInspection, equipmentType, skillLevel, standardTime, description, status, remark } = req.body

  if (!processName || !processName.trim()) return res.json({ code: 400, message: '工序名称不能为空' })

  const code = await resolveBusinessCode('process', processCode, 'GX')
  const nextIsKeyProcess = toBoolFlag(isKeyProcess)
  const nextProcessType = normalizeProcessType(nextIsKeyProcess, processType)
  const duplicateMessage = getDuplicateMessageByRule(db, 'process', code)
  if (duplicateMessage) return res.json({ code: 400, message: duplicateMessage })

  try {
    const result = await db.run(
      `INSERT INTO processes (process_code, process_name, process_type, is_key_process, is_inspection,
        is_force_inspection, equipment_type, skill_level, standard_time, description, status, remark, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    , [code,
      processName.trim(),
      nextProcessType,
      nextIsKeyProcess,
      toBoolFlag(isInspection),
      toBoolFlag(isForceInspection),
      (equipmentType || '').trim(),
      (skillLevel || '').trim(),
      standardTime !== undefined && standardTime !== null && standardTime !== '' ? Number(standardTime) : null,
      (description || '').trim(),
      status !== undefined ? Number(status) : 1,
      (remark || '').trim(),
      req.user.id])
    res.json({ code: 200, message: '添加成功', data: { id: Number(result.insertId) } })
  } catch (error) {
    console.error('添加工序失败:', error.message)
    res.json({ code: 500, message: '添加失败' })
  }
})

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT * FROM processes WHERE id = ?', [id])
  if (!existing) return res.json({ code: 404, message: '工序不存在' })

  const { processCode, processName, processType, isKeyProcess, isInspection,
    isForceInspection, equipmentType, skillLevel, standardTime, description, status, remark } = req.body

  if (processCode && processCode.trim() !== existing.process_code) {
    const duplicateMessage = getDuplicateMessageByRule(db, 'process', processCode.trim(), { excludeId: id })
    if (duplicateMessage) return res.json({ code: 400, message: duplicateMessage })
  }

  const toNull = (v) => (v !== undefined && v !== null && v !== '' ? Number(v) : null)
  const nextIsKeyProcess = isKeyProcess !== undefined ? toBoolFlag(isKeyProcess) : existing.is_key_process
  const nextProcessType = processType !== undefined || isKeyProcess !== undefined
    ? normalizeProcessType(nextIsKeyProcess, processType !== undefined ? processType : existing.process_type)
    : existing.process_type

  try {
    await db.run(
      `UPDATE processes SET process_code=?, process_name=?, process_type=?, is_key_process=?, is_inspection=?,
        is_force_inspection=?, equipment_type=?, skill_level=?, standard_time=?, description=?, status=?, remark=?,
        updated_at=NOW() WHERE id=?`
    , [processCode !== undefined ? String(processCode).trim() : existing.process_code,
      processName !== undefined ? String(processName).trim() : existing.process_name,
      nextProcessType,
      nextIsKeyProcess,
      isInspection !== undefined ? toBoolFlag(isInspection) : existing.is_inspection,
      isForceInspection !== undefined ? toBoolFlag(isForceInspection) : existing.is_force_inspection,
      equipmentType !== undefined ? String(equipmentType).trim() : existing.equipment_type,
      skillLevel !== undefined ? String(skillLevel).trim() : existing.skill_level,
      standardTime !== undefined ? toNull(standardTime) : existing.standard_time,
      description !== undefined ? String(description).trim() : existing.description,
      status !== undefined ? Number(status) : existing.status,
      remark !== undefined ? String(remark).trim() : existing.remark,
      id])
    res.json({ code: 200, message: '更新成功' })
  } catch (error) {
    console.error('更新工序失败:', error.message)
    res.json({ code: 500, message: '更新失败' })
  }
})

router.put('/:id/status', async (req, res) => {
  const id = Number(req.params.id)
  const { status } = req.body
  const existing = await db.get('SELECT id FROM processes WHERE id = ?', [id])
  if (!existing) return res.json({ code: 404, message: '工序不存在' })

  try {
    await db.run(
      `UPDATE processes SET status=?, updated_at=NOW() WHERE id=?`
    , [Number(status), id])
    res.json({ code: 200, message: '状态更新成功' })
  } catch (error) {
    console.error('更新工序状态失败:', error.message)
    res.json({ code: 500, message: '状态更新失败' })
  }
})

// 批量导入
router.post('/import', async (req, res) => {
  const { rows: list } = req.body
  if (!Array.isArray(list) || list.length === 0) {
    return res.json({ code: 400, message: '导入数据不能为空' })
  }

  const toNum = (v) => (v !== undefined && v !== null && v !== '') ? Number(v) : null

  const errors = []
  let success = 0
try {
    await db.transaction(async (conn) => {
      for (let i = 0; i < list.length; i++) {
        const row = list[i]
        const rowNum = i + 1
        try {
          if (!row.processCode || !String(row.processCode).trim()) {
            errors.push(`第${rowNum}行：工序编码不能为空`); continue
          }
          if (!row.processName || !String(row.processName).trim()) {
            errors.push(`第${rowNum}行：工序名称不能为空`); continue
          }

          const code = String(row.processCode).trim()
          const dup = await db.get('SELECT id FROM processes WHERE process_code = ?', [code])
          if (dup) {
            errors.push(`第${rowNum}行：工序编码"${code}"已存在`); continue
          }

          await db.run(
    `INSERT INTO processes (process_code, process_name, process_type, is_key_process, is_inspection,
      is_force_inspection, equipment_type, skill_level, standard_time, description, status, remark, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  , [code,
            String(row.processName).trim(),
            normalizeProcessType(resolveKeyProcessFlag(row), row.processType),
            resolveKeyProcessFlag(row),
            toBoolFlag(row.isInspection),
            toBoolFlag(row.isForceInspection),
            (row.equipmentType || '').toString().trim(),
            (row.skillLevel || '').toString().trim(),
            toNum(row.standardTime),
            (row.description || '').toString().trim(),
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
    console.error('批量导入工序失败:', error.message)
    res.json({ code: 500, message: '导入失败：' + error.message })
  }
})

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT id FROM processes WHERE id = ?', [id])
  if (!existing) return res.json({ code: 404, message: '工序不存在' })

  const inRoute = await db.get('SELECT COUNT(*) as count FROM process_route_items WHERE process_id = ?', [id])
  if (inRoute.count > 0) return res.json({ code: 400, message: '该工序已被工艺路线引用，无法删除' })

  try {
    await db.run('DELETE FROM processes WHERE id = ?', [id])
    res.json({ code: 200, message: '删除成功' })
  } catch (error) {
    console.error('删除工序失败:', error.message)
    res.json({ code: 500, message: '删除失败' })
  }
})

router.post('/:id/attachments', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT id FROM processes WHERE id = ?', [id])
  if (!existing) return res.json({ code: 404, message: '工序不存在' })

  const { fileName, filePath, fileSize } = req.body
  if (!fileName || !filePath) return res.json({ code: 400, message: '文件信息不完整' })

  try {
    const result = await db.run(
      `INSERT INTO process_attachments (process_id, file_name, file_path, file_size, created_by)
       VALUES (?, ?, ?, ?, ?)`
    , [id, fileName, filePath, fileSize || 0, req.user.id])
    res.json({ code: 200, message: '上传成功', data: { id: Number(result.insertId) } })
  } catch (error) {
    console.error('添加工序附件失败:', error.message)
    res.json({ code: 500, message: '上传失败' })
  }
})

router.delete('/:id/attachments/:attachmentId', async (req, res) => {
  const attachmentId = Number(req.params.attachmentId)
  const existing = await db.get('SELECT id FROM process_attachments WHERE id = ?', [attachmentId])
  if (!existing) return res.json({ code: 404, message: '附件不存在' })

  try {
    await db.run('DELETE FROM process_attachments WHERE id = ?', [attachmentId])
    res.json({ code: 200, message: '删除成功' })
  } catch (error) {
    console.error('删除工序附件失败:', error.message)
    res.json({ code: 500, message: '删除失败' })
  }
})

module.exports = router
