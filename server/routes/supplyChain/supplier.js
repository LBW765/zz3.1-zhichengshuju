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
    supplierCode: row.supplier_code,
    supplierName: row.supplier_name,
    categoryId: row.category_id,
    categoryName: row.category_name || '',
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    email: row.email,
    province: row.province,
    city: row.city,
    district: row.district,
    address: row.address,
    bankName: row.bank_name,
    bankAccount: row.bank_account,
    taxNo: row.tax_no,
    taxRate: row.tax_rate,
    legalPerson: row.legal_person,
    businessLicense: row.business_license,
    supplierLevel: row.supplier_level,
    cooperationStatus: row.cooperation_status,
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
  const children = await db.all('SELECT id FROM supplier_categories WHERE parent_id = ?', [parentId])
  for (const child of children) {
    ids.push(...getDescendantCategoryIds(child.id))
  }
  return ids
}

router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 10))
  const offset = (page - 1) * pageSize
  const keyword = (req.query.keyword || '').trim()
  const categoryId = req.query.categoryId
  const cooperationStatus = (req.query.cooperationStatus || '').trim()
  const supplierLevel = (req.query.supplierLevel || '').trim()
  const status = req.query.status

  let conditions = ''
  const params = []

  if (keyword) {
    conditions += ' AND (s.supplier_code LIKE ? OR s.supplier_name LIKE ? OR s.contact_name LIKE ?)'
    const like = `%${keyword}%`
    params.push(like, like, like)
  }
  if (categoryId) {
    const catIds = getDescendantCategoryIds(Number(categoryId))
    conditions += ` AND s.category_id IN (${catIds.map(() => '?').join(',')})`
    params.push(...catIds)
  }
  if (cooperationStatus) {
    conditions += ' AND s.cooperation_status = ?'
    params.push(cooperationStatus)
  }
  if (supplierLevel) {
    conditions += ' AND s.supplier_level = ?'
    params.push(supplierLevel)
  }
  if (status !== undefined && status !== '') {
    conditions += ' AND s.status = ?'
    params.push(Number(status))
  }

  try {
    const total = (await db.get(
      `SELECT COUNT(*) as total FROM suppliers s WHERE 1=1${conditions}`
    , params)).total

    const rows = await db.all(
      `SELECT s.*, u.nick_name AS created_by_name, sc.category_name
       FROM suppliers s
       LEFT JOIN users u ON u.id = s.created_by
       LEFT JOIN supplier_categories sc ON sc.id = s.category_id
       WHERE 1=1${conditions}
       ORDER BY s.id DESC
       LIMIT ? OFFSET ?`
    , [...params, pageSize, offset])

    res.json({
      code: 200,
      message: '获取成功',
      data: { list: rows.map(toApi), total, page, pageSize }
    })
  } catch (error) {
    console.error('获取供应商列表失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id)
  try {
    const row = await db.get(
      `SELECT s.*, u.nick_name AS created_by_name, sc.category_name
       FROM suppliers s
       LEFT JOIN users u ON u.id = s.created_by
       LEFT JOIN supplier_categories sc ON sc.id = s.category_id
       WHERE s.id = ?`
    , [id])

    if (!row) return res.json({ code: 404, message: '供应商不存在' })
    res.json({ code: 200, message: '获取成功', data: toApi(row) })
  } catch (error) {
    console.error('获取供应商详情失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

router.post('/', async (req, res) => {
  const b = req.body

  if (!b.supplierName || !b.supplierName.trim()) {
    return res.json({ code: 400, message: '供应商名称不能为空' })
  }

  const code = await resolveBusinessCode('supplier', b.supplierCode, 'GYS')
  const duplicateMessage = getDuplicateMessageByRule(db, 'supplier', code)
  if (duplicateMessage) return res.json({ code: 400, message: duplicateMessage })

  try {
    const result = await db.run(
      `INSERT INTO suppliers (supplier_code, supplier_name, category_id, contact_name, contact_phone, email, province, city, district, address, bank_name, bank_account, tax_no, tax_rate, legal_person, business_license, supplier_level, cooperation_status, status, remark, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    , [code,
      b.supplierName.trim(),
      b.categoryId || null,
      (b.contactName || '').trim(),
      (b.contactPhone || '').trim(),
      (b.email || '').trim(),
      (b.province || '').trim(),
      (b.city || '').trim(),
      (b.district || '').trim(),
      (b.address || '').trim(),
      (b.bankName || '').trim(),
      (b.bankAccount || '').trim(),
      (b.taxNo || '').trim(),
      b.taxRate != null ? Number(b.taxRate) : null,
      (b.legalPerson || '').trim(),
      (b.businessLicense || '').trim(),
      (b.supplierLevel || '待评').trim(),
      (b.cooperationStatus || '合作中').trim(),
      b.status !== undefined ? Number(b.status) : 1,
      (b.remark || '').trim(),
      req.user.id])
    res.json({ code: 200, message: '添加成功', data: { id: Number(result.insertId), supplierCode: code } })
  } catch (error) {
    console.error('添加供应商失败:', error.message)
    res.json({ code: 500, message: '添加失败' })
  }
})

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT * FROM suppliers WHERE id = ?', [id])
  if (!existing) return res.json({ code: 404, message: '供应商不存在' })

  const b = req.body

  try {
    await db.run(
      `UPDATE suppliers SET supplier_name=?, category_id=?, contact_name=?, contact_phone=?, email=?, province=?, city=?, district=?, address=?, bank_name=?, bank_account=?, tax_no=?, tax_rate=?, legal_person=?, business_license=?, supplier_level=?, cooperation_status=?, status=?, remark=?, updated_at=NOW() WHERE id=?`
    , [b.supplierName !== undefined ? String(b.supplierName).trim() : existing.supplier_name,
      b.categoryId !== undefined ? (b.categoryId || null) : existing.category_id,
      b.contactName !== undefined ? String(b.contactName).trim() : existing.contact_name,
      b.contactPhone !== undefined ? String(b.contactPhone).trim() : existing.contact_phone,
      b.email !== undefined ? String(b.email).trim() : existing.email,
      b.province !== undefined ? String(b.province).trim() : existing.province,
      b.city !== undefined ? String(b.city).trim() : existing.city,
      b.district !== undefined ? String(b.district).trim() : existing.district,
      b.address !== undefined ? String(b.address).trim() : existing.address,
      b.bankName !== undefined ? String(b.bankName).trim() : existing.bank_name,
      b.bankAccount !== undefined ? String(b.bankAccount).trim() : existing.bank_account,
      b.taxNo !== undefined ? String(b.taxNo).trim() : existing.tax_no,
      b.taxRate !== undefined ? (b.taxRate != null ? Number(b.taxRate) : null) : existing.tax_rate,
      b.legalPerson !== undefined ? String(b.legalPerson).trim() : existing.legal_person,
      b.businessLicense !== undefined ? String(b.businessLicense).trim() : existing.business_license,
      b.supplierLevel !== undefined ? String(b.supplierLevel).trim() : existing.supplier_level,
      b.cooperationStatus !== undefined ? String(b.cooperationStatus).trim() : existing.cooperation_status,
      b.status !== undefined ? Number(b.status) : existing.status,
      b.remark !== undefined ? String(b.remark).trim() : existing.remark,
      id])
    res.json({ code: 200, message: '更新成功' })
  } catch (error) {
    console.error('更新供应商失败:', error.message)
    res.json({ code: 500, message: '更新失败' })
  }
})

router.put('/:id/status', async (req, res) => {
  const id = Number(req.params.id)
  const { status } = req.body
  const existing = await db.get('SELECT id FROM suppliers WHERE id = ?', [id])
  if (!existing) return res.json({ code: 404, message: '供应商不存在' })

  try {
    await db.run(
      `UPDATE suppliers SET status=?, updated_at=NOW() WHERE id=?`
    , [Number(status), id])
    res.json({ code: 200, message: '状态更新成功' })
  } catch (error) {
    console.error('更新供应商状态失败:', error.message)
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

  // Build category name → id cache
  const categoryCache = {}
  const allCategories = await db.all('SELECT id, category_name FROM supplier_categories')
  for (const cat of allCategories) {
    categoryCache[cat.category_name] = cat.id
  }

  
  

  await db.transaction(async (conn) => {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      const rowIndex = i + 1
      try {
        const code = (r.supplierCode || '').trim()
        const name = (r.supplierName || '').trim()

        if (!code) { errors.push(`第${rowIndex}行：供应商编码不能为空`); continue }
        if (!name) { errors.push(`第${rowIndex}行：供应商名称不能为空`); continue }

        if (await db.get('SELECT id FROM suppliers WHERE supplier_code = ?', [code])) {
          errors.push(`第${rowIndex}行：供应商编码 ${code} 已存在`)
          continue
        }

        let categoryId = r.categoryId || null
        if (!categoryId && r.categoryName) {
          categoryId = categoryCache[r.categoryName.trim()] || null
          if (!categoryId) {
            errors.push(`第${rowIndex}行：分类 "${r.categoryName}" 不存在`)
            continue
          }
        }

        await db.run(
    `INSERT INTO suppliers (supplier_code, supplier_name, category_id, contact_name, contact_phone, email, province, city, district, address, bank_name, bank_account, tax_no, tax_rate, legal_person, business_license, supplier_level, cooperation_status, status, remark, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  , [code,
          name,
          categoryId,
          (r.contactName || '').trim(),
          (r.contactPhone || '').trim(),
          (r.email || '').trim(),
          (r.province || '').trim(),
          (r.city || '').trim(),
          (r.district || '').trim(),
          (r.address || '').trim(),
          (r.bankName || '').trim(),
          (r.bankAccount || '').trim(),
          (r.taxNo || '').trim(),
          r.taxRate != null ? Number(r.taxRate) : null,
          (r.legalPerson || '').trim(),
          (r.businessLicense || '').trim(),
          (r.supplierLevel || '待评').trim(),
          (r.cooperationStatus || '合作中').trim(),
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
    console.error('导入供应商失败:', error.message)
    res.json({ code: 500, message: '导入失败：' + error.message })
  }
})

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT id FROM suppliers WHERE id = ?', [id])
  if (!existing) return res.json({ code: 404, message: '供应商不存在' })

  try {
    await db.run('DELETE FROM suppliers WHERE id = ?', [id])
    res.json({ code: 200, message: '删除成功' })
  } catch (error) {
    console.error('删除供应商失败:', error.message)
    res.json({ code: 500, message: '删除失败' })
  }
})

module.exports = router
