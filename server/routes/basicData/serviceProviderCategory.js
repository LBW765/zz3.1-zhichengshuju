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
  let sql = 'SELECT * FROM service_provider_categories'
  const params = []

  if (status !== undefined && status !== '') {
    sql += ' WHERE status = ?'
    params.push(Number(status))
  }

  sql += ' ORDER BY sort ASC, id ASC'

  try {
    const rows = await db.all(sql, params)
    res.json({ code: 200, message: '获取成功', data: { list: rows.map(toApi) } })
  } catch (error) {
    console.error('获取服务商分类失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

router.post('/', async (req, res) => {
  const { parentId, categoryName, categoryCode, sort, status, remark } = req.body

  if (!categoryName || !categoryName.trim()) return res.json({ code: 400, message: '分类名称不能为空' })

  const code = await resolveBusinessCode('service_provider_category', categoryCode, 'FWSFL')
  const duplicateMessage = getDuplicateMessageByRule(db, 'service_provider_category', code)
  if (duplicateMessage) return res.json({ code: 400, message: duplicateMessage })

  try {
    const result = await db.run(
      `INSERT INTO service_provider_categories (parent_id, category_name, category_code, sort, status, remark, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    , [parentId || null,
      categoryName.trim(),
      code,
      sort !== undefined ? Number(sort) : 0,
      status !== undefined ? Number(status) : 1,
      (remark || '').trim(),
      req.user.id])
    res.json({ code: 200, message: '添加成功', data: { id: Number(result.insertId) } })
  } catch (error) {
    console.error('添加服务商分类失败:', error.message)
    res.json({ code: 500, message: '添加失败' })
  }
})

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT * FROM service_provider_categories WHERE id = ?', [id])
  if (!existing) return res.json({ code: 404, message: '分类不存在' })

  const { parentId, categoryName, categoryCode, sort, status, remark } = req.body

  if (categoryCode && categoryCode.trim() !== existing.category_code) {
    const duplicateMessage = getDuplicateMessageByRule(db, 'service_provider_category', categoryCode.trim(), { excludeId: id })
    if (duplicateMessage) return res.json({ code: 400, message: duplicateMessage })
  }

  if (parentId !== undefined && Number(parentId) === id) {
    return res.json({ code: 400, message: '不能将自身设为父分类' })
  }

  try {
    await db.run(
      `UPDATE service_provider_categories SET parent_id=?, category_name=?, category_code=?, sort=?, status=?, remark=?, updated_at=NOW() WHERE id=?`
    , [parentId !== undefined ? (parentId || null) : existing.parent_id,
      categoryName !== undefined ? String(categoryName).trim() : existing.category_name,
      categoryCode !== undefined ? String(categoryCode).trim() : existing.category_code,
      sort !== undefined ? Number(sort) : existing.sort,
      status !== undefined ? Number(status) : existing.status,
      remark !== undefined ? String(remark).trim() : existing.remark,
      id])
    res.json({ code: 200, message: '更新成功' })
  } catch (error) {
    console.error('更新服务商分类失败:', error.message)
    res.json({ code: 500, message: '更新失败' })
  }
})

router.post('/import', async (req, res) => {
  const rows = req.body.rows
  if (!Array.isArray(rows) || !rows.length) return res.json({ code: 400, message: '无数据' })

  let success = 0
  let failed = 0
  const errors = []
await db.transaction(async (conn) => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2
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
        const dup = await db.get('SELECT id FROM service_provider_categories WHERE category_code = ?', [String(row.categoryCode).trim()])
        if (dup) {
          errors.push({ row: rowNum, message: `分类编码「${row.categoryCode}」已存在` })
          failed++
          continue
        }
        let parentId = null
        if (row.parentCode) {
          const parent = await db.get('SELECT id FROM service_provider_categories WHERE category_code = ?', [String(row.parentCode).trim()])
          if (!parent) {
            errors.push({ row: rowNum, message: `上级分类编码「${row.parentCode}」不存在` })
            failed++
            continue
          }
          parentId = parent.id
        }
        await db.run(
    `INSERT INTO service_provider_categories (parent_id, category_name, category_code, sort, status, remark, created_by)
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
    res.json({ code: 200, message: '导入完成', data: { total: rows.length, success, failed, errors } })
  } catch (error) {
    console.error('导入服务商分类失败:', error.message)
    res.json({ code: 500, message: '导入失败: ' + error.message })
  }
})

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT id FROM service_provider_categories WHERE id = ?', [id])
  if (!existing) return res.json({ code: 404, message: '分类不存在' })

  const children = await db.get('SELECT COUNT(*) as count FROM service_provider_categories WHERE parent_id = ?', [id])
  if (children.count > 0) return res.json({ code: 400, message: '该分类下有子分类，无法删除' })

  const providers = await db.get('SELECT COUNT(*) as count FROM service_providers WHERE category_id = ?', [id])
  if (providers.count > 0) return res.json({ code: 400, message: '该分类下有服务商，无法删除' })

  try {
    await db.run('DELETE FROM service_provider_categories WHERE id = ?', [id])
    res.json({ code: 200, message: '删除成功' })
  } catch (error) {
    console.error('删除服务商分类失败:', error.message)
    res.json({ code: 500, message: '删除失败' })
  }
})

module.exports = router


