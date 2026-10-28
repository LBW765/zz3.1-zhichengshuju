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
    groupName: row.group_name,
    groupCode: row.group_code,
    status: row.status,
    remark: row.remark || '',
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
    conditions += ' AND (g.group_name LIKE ? OR g.group_code LIKE ?)'
    const like = `%${keyword}%`
    params.push(like, like)
  }
  if (status !== undefined && status !== '') {
    conditions += ' AND g.status = ?'
    params.push(Number(status))
  }

  try {
    const rows = await db.all(
      `SELECT g.*, u.nick_name AS created_by_name
       FROM unit_groups g
       LEFT JOIN users u ON u.id = g.created_by
       WHERE 1=1${conditions}
       ORDER BY g.id ASC`
    , params)

    res.json({ code: 200, message: '操作成功', data: { list: rows.map(toApi) } })
  } catch (error) {
    console.error('获取单位组列表失败:', error.message)
    res.json({ code: 500, message: '操作失败' })
  }
})

router.post('/', async (req, res) => {
  const { groupName, groupCode, status, remark } = req.body

  if (!groupName || !groupName.trim()) {
    return res.json({ code: 400, message: '请填写单位组名称' })
  }
  if (groupCode !== undefined && groupCode !== null && !String(groupCode).trim()) {
    return res.json({ code: 400, message: '请填写单位组编码' })
  }
  const code = await resolveBusinessCode('unit_group', groupCode, 'DWZ')
  const duplicateMessage = getDuplicateMessageByRule(db, 'unit_group', code)
  if (duplicateMessage) return res.json({ code: 400, message: duplicateMessage })

  try {
    const result = await db.run(
      `INSERT INTO unit_groups (group_name, group_code, status, remark, created_by)
       VALUES (?, ?, ?, ?, ?)`
    , [groupName.trim(),
      code,
      status !== undefined ? Number(status) : 1,
      (remark || '').trim(),
      req.user.id])
    res.json({ code: 200, message: '操作成功', data: { id: Number(result.insertId) } })
  } catch (error) {
    console.error('添加单位组失败:', error.message)
    res.json({ code: 500, message: '操作失败' })
  }
})

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT * FROM unit_groups WHERE id = ?', [id])
  if (!existing) return res.json({ code: 404, message: '单位组不存在或已被删除' })

  const { groupName, groupCode, status, remark } = req.body

  if (groupCode && groupCode.trim() !== existing.group_code) {
    const duplicateMessage = getDuplicateMessageByRule(db, 'unit_group', groupCode.trim(), { excludeId: id })
    if (duplicateMessage) return res.json({ code: 400, message: duplicateMessage })
  }

  try {
    await db.run(
      `UPDATE unit_groups SET group_name=?, group_code=?, status=?, remark=?, updated_at=NOW() WHERE id=?`
    , [groupName !== undefined ? String(groupName).trim() : existing.group_name,
      groupCode !== undefined ? String(groupCode).trim() : existing.group_code,
      status !== undefined ? Number(status) : existing.status,
      remark !== undefined ? String(remark).trim() : existing.remark,
      id])
    res.json({ code: 200, message: '操作成功' })
  } catch (error) {
    console.error('更新单位组失败:', error.message)
    res.json({ code: 500, message: '更新单位组失败，请稍后重试' })
  }
})

router.put('/:id/status', async (req, res) => {
  const id = Number(req.params.id)
  const { status } = req.body
  const existing = await db.get('SELECT id FROM unit_groups WHERE id = ?', [id])
  if (!existing) return res.json({ code: 404, message: '数据不存在' })

  try {
    await db.run(
      `UPDATE unit_groups SET status=?, updated_at=NOW() WHERE id=?`
    , [Number(status), id])
    res.json({ code: 200, message: '操作成功' })
  } catch (error) {
    console.error('更新单位组状态失败:', error.message)
    res.json({ code: 500, message: '操作失败' })
  }
})

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT * FROM unit_groups WHERE id = ?', [id])
  if (!existing) return res.json({ code: 404, message: '单位组不存在或已被删除' })

  const unitCount = (await db.get('SELECT COUNT(*) AS count FROM units WHERE group_id = ?', [id])).count
  if (unitCount > 0) {
    return res.json({ code: 400, message: `该单位组下还有 ${unitCount} 个计量单位，不能删除。请先删除或调整这些计量单位。` })
  }

  try {
    await db.run('DELETE FROM unit_groups WHERE id = ?', [id])
    res.json({ code: 200, message: '删除成功' })
  } catch (error) {
    console.error('删除单位组失败:', error.message)
    res.json({ code: 500, message: '删除单位组失败，请稍后重试' })
  }
})

// Batch import
router.post('/import', async (req, res) => {
  const { rows: list } = req.body
  if (!Array.isArray(list) || list.length === 0) {
    return res.json({ code: 400, message: '请先上传要导入的数据' })
  }

  const errors = []
  let success = 0
try {
    await db.transaction(async (conn) => {
      for (let i = 0; i < list.length; i++) {
        const row = list[i]
        const rowNum = row.__rowNo || i + 2
        try {
          if (!row.groupCode || !String(row.groupCode).trim()) {
            errors.push({ row: rowNum, message: '单位组编码不能为空' })
            continue
          }
          if (!row.groupName || !String(row.groupName).trim()) {
            errors.push({ row: rowNum, message: '单位组名称不能为空' })
            continue
          }

          const code = String(row.groupCode).trim()
          const dup = await db.get('SELECT id FROM unit_groups WHERE group_code = ?', [code])
          if (dup) {
            errors.push({ row: rowNum, message: `单位组编码“${code}”已存在` })
            continue
          }

          await db.run(
    `INSERT INTO unit_groups (group_code, group_name, status, remark, created_by)
     VALUES (?, ?, ?, ?, ?)`
  , [code, String(row.groupName).trim(), 1, (row.remark || '').toString().trim(), req.user.id])
          success++
        } catch (e) {
          errors.push({ row: rowNum, message: e.message || '导入失败' })
        }
      }
    })

    res.json({ code: 200, message: '导入完成', data: { total: list.length, success, failed: errors.length, errors } })
  } catch (error) {
    console.error('批量导入单位组失败:', error.message)
    res.json({ code: 500, message: '新增单位组失败，请稍后重试' })
  }
})
module.exports = router





