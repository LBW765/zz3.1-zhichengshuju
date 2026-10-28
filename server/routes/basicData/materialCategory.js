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
    parentId: row.parent_id,
    categoryName: row.category_name,
    categoryCode: row.category_code,
    sort: row.sort,
    status: row.status,
    remark: row.remark || '',
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

router.get('/', async (req, res) => {
  const status = req.query.status
  let sql = 'SELECT * FROM material_categories'
  const params = []

  if (status !== undefined && status !== '') {
    sql += ' WHERE status = ?'
    params.push(Number(status))
  }

  sql += ' ORDER BY sort ASC, id ASC'

  try {
    const rows = await db.all(sql, params)
    res.json({ code: 200, message: '操作成功', data: { list: rows.map(toApi) } })
  } catch (error) {
    console.error('获取物料分类失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

router.post('/', async (req, res) => {
  const { parentId, categoryName, categoryCode, sort, status, remark } = req.body

  if (!categoryName || !categoryName.trim()) return res.json({ code: 400, message: '请填写物料分类名称' })
  const code = await resolveBusinessCode('material_category', categoryCode, 'WLFL')
  const duplicateMessage = getDuplicateMessageByRule(db, 'material_category', code)
  if (duplicateMessage) return res.json({ code: 400, message: duplicateMessage })

  try {
    const result = await db.run(
      `INSERT INTO material_categories (parent_id, category_name, category_code, sort, status, remark, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    , [parentId || null,
      categoryName.trim(),
      code,
      sort !== undefined ? Number(sort) : 0,
      status !== undefined ? Number(status) : 1,
      (remark || '').trim(),
      req.user.id])
    res.json({ code: 200, message: '操作成功', data: { id: Number(result.insertId) } })
  } catch (error) {
    console.error('添加物料分类失败:', error.message)
    res.json({ code: 500, message: '添加失败' })
  }
})

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT * FROM material_categories WHERE id = ?', [id])
  if (!existing) return res.json({ code: 404, message: '数据不存在' })

  const { parentId, categoryName, categoryCode, sort, status, remark } = req.body

  if (categoryCode && categoryCode.trim() !== existing.category_code) {
    const duplicateMessage = getDuplicateMessageByRule(db, 'material_category', categoryCode.trim(), { excludeId: id })
    if (duplicateMessage) return res.json({ code: 400, message: duplicateMessage })
  }

  if (parentId !== undefined && Number(parentId) === id) {
    return res.json({ code: 400, message: '不能将自身设为父分类' })
  }

  try {
    await db.run(
      `UPDATE material_categories SET parent_id=?, category_name=?, category_code=?, sort=?, status=?, remark=?, updated_at=NOW() WHERE id=?`
    , [parentId !== undefined ? (parentId || null) : existing.parent_id,
      categoryName !== undefined ? String(categoryName).trim() : existing.category_name,
      categoryCode !== undefined ? String(categoryCode).trim() : existing.category_code,
      sort !== undefined ? Number(sort) : existing.sort,
      status !== undefined ? Number(status) : existing.status,
      remark !== undefined ? String(remark).trim() : existing.remark,
      id])
    res.json({ code: 200, message: '操作成功' })
  } catch (error) {
    console.error('更新物料分类失败:', error.message)
    res.json({ code: 500, message: '更新失败' })
  }
})

router.post('/import', async (req, res) => {
  const rows = req.body.rows
  if (!Array.isArray(rows) || !rows.length) return res.json({ code: 400, message: '请先上传要导入的数据' })

  let success = 0
  let failed = 0
  const errors = []
await db.transaction(async (conn) => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = row.__rowNo || i + 2
      try {
        if (!row.categoryCode || !String(row.categoryCode).trim()) {
          errors.push({ row: rowNum, message: '分类编码不能为空' })
          failed++
          continue
        }
        if (!row.categoryName || !String(row.categoryName).trim()) {
          errors.push({ row: rowNum, message: '分类名称不能为空' })
          failed++
          continue
        }
        const dup = await db.get('SELECT id FROM material_categories WHERE category_code = ?', [String(row.categoryCode).trim()])
        if (dup) {
          errors.push({ row: rowNum, message: `分类编码「${row.categoryCode}」已存在` })
          failed++
          continue
        }
        let parentId = null
        if (row.parentCode) {
          const parent = await db.get('SELECT id FROM material_categories WHERE category_code = ?', [String(row.parentCode).trim()])
          if (!parent) {
            errors.push({ row: rowNum, message: `上级分类编码「${row.parentCode}」不存在` })
            failed++
            continue
          }
          parentId = parent.id
        }
        await db.run(
    `INSERT INTO material_categories (parent_id, category_name, category_code, sort, status, remark, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  , [parentId,
          String(row.categoryName).trim(),
          String(row.categoryCode).trim(),
          row.sort !== undefined && row.sort !== '' ? Number(row.sort) : 0,
          1,
          (row.remark || '').toString().trim(),
          req.user.id])
        success++
      } catch (e) {
        errors.push({ row: rowNum, message: e.message })
        failed++
      }
    }
  })

  try {
    importAll()
    res.json({ code: 200, message: '操作成功', data: { total: rows.length, success, failed, errors } })
  } catch (error) {
    console.error('导入物料分类失败:', error.message)
    res.json({ code: 500, message: '导入失败: ' + error.message })
  }
})

router.post('/export', async (req, res) => {
  const { scope = 'allFiltered', ids = [], fields = [] } = req.body || {}
  const allowedFields = new Set(['categoryCode', 'categoryName', 'parentCode', 'parentName', 'sort', 'status', 'remark', 'createdAt'])

  if (!Array.isArray(fields) || !fields.length) {
    return res.json({ code: 400, message: '请选择至少一个导出字段' })
  }
  const invalidField = fields.find(field => !allowedFields.has(field))
  if (invalidField) {
    return res.json({ code: 400, message: `不允许导出字段：${invalidField}` })
  }

  const params = []
  let conditions = ''
  if (scope === 'selected') {
    if (!Array.isArray(ids) || !ids.length) return res.json({ code: 400, message: '请选择要导出的数据' })
    conditions = ` WHERE c.id IN (${ids.map(() => '?').join(',')})`
    params.push(...ids.map(Number))
  }

  try {
    const rows = await db.all(`
      SELECT c.*, p.category_code AS parent_code, p.category_name AS parent_name
      FROM material_categories c
      LEFT JOIN material_categories p ON p.id = c.parent_id
      ${conditions}
      ORDER BY c.sort ASC, c.id ASC
    `, params)

    const list = rows.map(row => ({
      id: row.id,
      categoryCode: row.category_code,
      categoryName: row.category_name,
      parentCode: row.parent_code || '',
      parentName: row.parent_name || '',
      sort: row.sort,
      status: row.status === 1 ? '启用' : '停用',
      remark: row.remark || '',
      createdAt: row.created_at
    }))

    res.json({ code: 200, message: '操作成功', data: { list } })
  } catch (error) {
    console.error('导出物料分类失败:', error.message)
    res.json({ code: 500, message: '导出失败' })
  }
})

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT id FROM material_categories WHERE id = ?', [id])
  if (!existing) return res.json({ code: 404, message: '数据不存在' })

  const children = await db.get('SELECT COUNT(*) as count FROM material_categories WHERE parent_id = ?', [id])
  if (children.count > 0) return res.json({ code: 400, message: '该分类下还有子分类，不能删除' })

  const materials = await db.get('SELECT COUNT(*) as count FROM materials WHERE category_id = ?', [id])
  if (materials.count > 0) return res.json({ code: 400, message: '该分类已被物料使用，不能删除' })

  try {
    await db.run('DELETE FROM material_categories WHERE id = ?', [id])
    res.json({ code: 200, message: '操作成功' })
  } catch (error) {
    console.error('删除物料分类失败:', error.message)
    res.json({ code: 500, message: '删除失败' })
  }
})

module.exports = router



