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
    groupId: row.group_id,
    groupName: row.group_name || '',
    groupCode: row.group_code || '',
    unitName: row.unit_name,
    unitCode: row.unit_code,
    isBaseUnit: row.is_base_unit,
    conversionRate: row.conversion_rate,
    precisionNum: row.precision_num,
    sort: row.sort,
    status: row.status,
    remark: row.remark || '',
    createdBy: row.created_by,
    createdByName: row.created_by_name || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

router.get('/', async (req, res) => {
  const groupId = req.query.groupId
  const groupName = (req.query.groupName || '').trim()
  const groupCode = (req.query.groupCode || '').trim()
  const unitName = (req.query.unitName || '').trim()
  const unitCode = (req.query.unitCode || '').trim()
  const status = req.query.status

  let conditions = ''
  const params = []

  if (groupId) {
    conditions += ' AND u.group_id = ?'
    params.push(Number(groupId))
  }
  if (groupName) {
    conditions += ' AND g.group_name LIKE ?'
    params.push(`%${groupName}%`)
  }
  if (groupCode) {
    conditions += ' AND g.group_code LIKE ?'
    params.push(`%${groupCode}%`)
  }
  if (unitName) {
    conditions += ' AND u.unit_name LIKE ?'
    params.push(`%${unitName}%`)
  }
  if (unitCode) {
    conditions += ' AND u.unit_code LIKE ?'
    params.push(`%${unitCode}%`)
  }
  if (status !== undefined && status !== '') {
    conditions += ' AND u.status = ?'
    params.push(Number(status))
  }

  try {
    const rows = await db.all(
      `SELECT u.*, g.group_name, g.group_code, usr.nick_name AS created_by_name
       FROM units u
       LEFT JOIN unit_groups g ON g.id = u.group_id
       LEFT JOIN users usr ON usr.id = u.created_by
       WHERE 1=1${conditions}
       ORDER BY u.group_id ASC, u.sort ASC, u.id ASC`
    , params)

    res.json({ code: 200, message: '操作成功', data: { list: rows.map(toApi) } })
  } catch (error) {
    console.error('获取计量单位列表失败:', error.message)
    res.json({ code: 500, message: '新增计量单位失败，请稍后重试' })
  }
})

router.post('/', async (req, res) => {
  const { groupId, unitName, unitCode, isBaseUnit, conversionRate, precisionNum, sort, status, remark } = req.body

  if (!groupId) {
    return res.json({ code: 400, message: '请先选择单位组' })
  }
  if (!unitName || !unitName.trim()) {
    return res.json({ code: 400, message: '请填写单位名称' })
  }
  if (unitCode !== undefined && unitCode !== null && !String(unitCode).trim()) {
    return res.json({ code: 400, message: '请填写单位符号' })
  }
  const code = await resolveBusinessCode('unit', unitCode, 'DW')
  const duplicateMessage = getDuplicateMessageByRule(db, 'unit', code)
  if (duplicateMessage) return res.json({ code: 400, message: duplicateMessage })

  const isBase = Number(isBaseUnit) || 0
  if (!isBase && (conversionRate === undefined || conversionRate === null || conversionRate === '')) {
    return res.json({ code: 400, message: '非基准单位必须填写换算率' })
  }

  try {
    await db.transaction(async (conn) => {
      if (isBase) {
        await db.run(
          `UPDATE units SET is_base_unit=0, updated_at=NOW() WHERE group_id=? AND is_base_unit=1`
        , [Number(groupId)])
      }

      await db.run(
        `INSERT INTO units (group_id, unit_name, unit_code, is_base_unit, conversion_rate, precision_num, sort, status, remark, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      , [Number(groupId),
        unitName.trim(),
        code,
        isBase,
        isBase ? 1 : Number(conversionRate),
        precisionNum !== undefined ? Number(precisionNum) : 2,
        sort !== undefined ? Number(sort) : 0,
        status !== undefined ? Number(status) : 1,
        (remark || '').trim(),
        req.user.id])
    })

    const inserted = await db.get('SELECT id FROM units WHERE unit_code = ?', [code])
    res.json({ code: 200, message: '操作成功', data: { id: inserted.id } })
  } catch (error) {
    console.error('添加计量单位失败:', error.message)
    res.json({ code: 500, message: '操作失败' })
  }
})

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT * FROM units WHERE id = ?', [id])
  if (!existing) return res.json({ code: 404, message: '计量单位不存在或已被删除' })

  const { unitName, unitCode, isBaseUnit, conversionRate, precisionNum, sort, status, remark } = req.body

  if (unitCode && unitCode.trim() !== existing.unit_code) {
    const duplicateMessage = getDuplicateMessageByRule(db, 'unit', unitCode.trim(), { excludeId: id })
    if (duplicateMessage) return res.json({ code: 400, message: duplicateMessage })
  }

  const isBase = isBaseUnit !== undefined ? Number(isBaseUnit) : existing.is_base_unit
  if (!isBase && conversionRate !== undefined && (conversionRate === null || conversionRate === '')) {
    return res.json({ code: 400, message: '非基准单位必须填写换算率' })
  }

  try {
    await db.transaction(async (conn) => {
      if (isBase && !existing.is_base_unit) {
        await db.run(
          `UPDATE units SET is_base_unit=0, updated_at=NOW() WHERE group_id=? AND is_base_unit=1`
        , [existing.group_id])
      }

      await db.run(
        `UPDATE units SET unit_name=?, unit_code=?, is_base_unit=?, conversion_rate=?, precision_num=?, sort=?, status=?, remark=?, updated_at=NOW() WHERE id=?`
      , [unitName !== undefined ? String(unitName).trim() : existing.unit_name,
        unitCode !== undefined ? String(unitCode).trim() : existing.unit_code,
        isBase,
        isBase ? 1 : (conversionRate !== undefined ? Number(conversionRate) : existing.conversion_rate),
        precisionNum !== undefined ? Number(precisionNum) : existing.precision_num,
        sort !== undefined ? Number(sort) : existing.sort,
        status !== undefined ? Number(status) : existing.status,
        remark !== undefined ? String(remark).trim() : existing.remark,
        id])
    })

    res.json({ code: 200, message: '操作成功' })
  } catch (error) {
    console.error('更新计量单位失败:', error.message)
    res.json({ code: 500, message: '更新计量单位失败，请稍后重试' })
  }
})

router.put('/:id/status', async (req, res) => {
  const id = Number(req.params.id)
  const { status } = req.body
  const existing = await db.get('SELECT id FROM units WHERE id = ?', [id])
  if (!existing) return res.json({ code: 404, message: '计量单位不存在或已被删除' })

  try {
    await db.run(
      `UPDATE units SET status=?, updated_at=NOW() WHERE id=?`
    , [Number(status), id])
    res.json({ code: 200, message: '操作成功' })
  } catch (error) {
    console.error('更新计量单位状态失败:', error.message)
    res.json({ code: 500, message: '更新计量单位状态失败，请稍后重试' })
  }
})

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT * FROM units WHERE id = ?', [id])
  if (!existing) return res.json({ code: 404, message: '计量单位不存在或已被删除' })

  const materialCount = (await db.get('SELECT COUNT(*) AS count FROM materials WHERE unit_id = ? OR aux_unit_id = ?', [id, id])).count
  if (materialCount > 0) {
    return res.json({ code: 400, message: `该计量单位已被 ${materialCount} 个物料使用，不能删除。请先调整物料档案。` })
  }

  try {
    await db.run('DELETE FROM units WHERE id = ?', [id])
    res.json({ code: 200, message: '删除成功' })
  } catch (error) {
    console.error('删除计量单位失败:', error.message)
    res.json({ code: 500, message: '删除计量单位失败，请稍后重试' })
  }
})

// Batch import
router.post('/import', async (req, res) => {
  const { rows: list } = req.body
  if (!Array.isArray(list) || list.length === 0) {
    return res.json({ code: 400, message: '请先上传要导入的数据' })
  }

  const toBool = (v) => (v === 1 || v === '1' || v === true || v === '是') ? 1 : 0
  const toNum = (v) => (v !== undefined && v !== null && v !== '') ? Number(v) : null
  const errors = []
  let success = 0
try {
    await db.transaction(async (conn) => {
      for (let i = 0; i < list.length; i++) {
        const row = list[i]
        const rowNum = row.__rowNo || i + 2
        try {
          if (!row.unitCode || !String(row.unitCode).trim()) {
            errors.push({ row: rowNum, message: '单位符号不能为空' })
            continue
          }
          if (!row.unitName || !String(row.unitName).trim()) {
            errors.push({ row: rowNum, message: '单位名称不能为空' })
            continue
          }
          if (!row.groupName || !String(row.groupName).trim()) {
            errors.push({ row: rowNum, message: '单位组名称不能为空' })
            continue
          }

          const code = String(row.unitCode).trim()
          const dup = await db.get('SELECT id FROM units WHERE unit_code = ?', [code])
          if (dup) {
            errors.push({ row: rowNum, message: `单位符号“${code}”已存在` })
            continue
          }

          let groupId = null
          const group = await db.get('SELECT id FROM unit_groups WHERE group_name = ?', [String(row.groupName).trim()])
          if (!group) {
            errors.push({ row: rowNum, message: `单位组“${row.groupName}”不存在` })
            continue
          }
          groupId = group.id

          const isBase = toBool(row.isBaseUnit)
          await db.run(
    `INSERT INTO units (group_id, unit_name, unit_code, is_base_unit, conversion_rate, precision_num, sort, status, remark, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  , [groupId,
            String(row.unitName).trim(),
            code,
            isBase,
            isBase ? 1 : (toNum(row.conversionRate) || 1),
            toNum(row.precision) !== null ? toNum(row.precision) : 2,
            toNum(row.sort) || 0,
            1,
            (row.remark || '').toString().trim(),
            req.user.id])
          success++
        } catch (e) {
          errors.push({ row: rowNum, message: e.message || '导入失败' })
        }
      }
    })

    res.json({ code: 200, message: '导入完成', data: { total: list.length, success, failed: errors.length, errors } })
  } catch (error) {
    console.error('批量导入计量单位失败:', error.message)
    res.json({ code: 500, message: '新增计量单位失败，请稍后重试' })
  }
})
module.exports = router





