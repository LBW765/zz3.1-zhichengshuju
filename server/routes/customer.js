const express = require('express')
const { db } = require('../db/index')
const { authMiddleware, roleMiddleware } = require('../middleware/auth')
const { resolveBusinessCode } = require('../services/codeGenerator')

const router = express.Router()

router.use(authMiddleware)
router.use(roleMiddleware('administrator', 'admin', 'user'))

function toApi(row) {
  if (!row) return null
  return {
    id: row.id,
    customerNo: row.customer_no,
    name: row.name,
    categoryId: row.category_id,
    categoryName: row.category_name || '',
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    email: row.email || '',
    province: row.province || '',
    city: row.city || '',
    district: row.district || '',
    address: row.address || '',
    bankName: row.bank_name || '',
    bankAccount: row.bank_account || '',
    taxNo: row.tax_no || '',
    creditLimit: row.credit_limit,
    customerLevel: row.customer_level || '',
    status: row.status,
    remark: row.remark || '',
    createdBy: row.created_by,
    createdByName: row.created_by_name || '',
    salesPoolId: row.sales_pool_id || null,
    salesPoolType: row.sales_pool_type || '',
    salesPoolStatus: row.sales_pool_status || '',
    salesPoolStage: row.sales_pool_stage || '',
    salesOwnerUserName: row.sales_owner_user_name || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function buildScopeClause(req) {
  const isManager = req.user.roles.some(r => r === 'administrator' || r === 'admin')
  if (isManager) return { sql: '', params: [] }
  return { sql: ' AND c.created_by = ?', params: [req.user.id] }
}

async function getDescendantCategoryIds(parentId) {
  const ids = [parentId]
  const children = await db.all('SELECT id FROM customer_categories WHERE parent_id = ?', [parentId])
  for (const child of children) {
    ids.push(...getDescendantCategoryIds(child.id))
  }
  return ids
}

function shouldSyncToPublicPool(value) {
  const normalized = String(value ?? '').trim().toLowerCase()
  return !(value === false || value === 0 || ['0', 'false', 'no', 'n', '否', '不', '不同步'].includes(normalized))
}

async function ensurePublicCustomerPool(customerId, userId) {
  const table = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='sales_customer_pool'")
  if (!table) return null

  const existing = await db.get('SELECT id FROM sales_customer_pool WHERE customer_id = ? ORDER BY id DESC LIMIT 1', [customerId])
  if (existing) return existing.id

  const poolCode = await resolveBusinessCode('sales_customer_pool', '', 'KHGZ')
  const result = await db.run(
    `INSERT INTO sales_customer_pool (
      pool_code, customer_id, pool_type, source_type, owner_user_id, claim_user_id, claim_at, status,
      latest_follow_at, latest_follow_result, current_stage, converted_opportunity_id, return_reason,
      created_by, created_at, updated_at
    ) VALUES (?, ?, 'public', 'base_data', NULL, NULL, '', 'public', '', '', '待申领', NULL, '', ?, NOW(), NOW())`
  , [poolCode, customerId, userId])
  return Number(result.insertId)
}

router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 10))
  const offset = (page - 1) * pageSize
  const keyword = (req.query.keyword || '').trim()
  const categoryId = req.query.categoryId
  const customerLevel = (req.query.customerLevel || '').trim()
  const status = req.query.status

  let conditions = ''
  const params = []

  if (keyword) {
    conditions += ' AND (c.customer_no LIKE ? OR c.name LIKE ? OR c.contact_name LIKE ?)'
    const like = `%${keyword}%`
    params.push(like, like, like)
  }
  if (categoryId) {
    const catIds = getDescendantCategoryIds(Number(categoryId))
    conditions += ` AND c.category_id IN (${catIds.map(() => '?').join(',')})`
    params.push(...catIds)
  }
  if (customerLevel) {
    conditions += ' AND c.customer_level = ?'
    params.push(customerLevel)
  }
  if (status !== undefined && status !== '') {
    conditions += ' AND c.status = ?'
    params.push(Number(status))
  }

  const scope = buildScopeClause(req)
  conditions += scope.sql
  params.push(...scope.params)

  try {
    const total = (await db.get(
      `SELECT COUNT(*) as total FROM customers c WHERE 1=1${conditions}`
    , params)).total

    const rows = await db.all(
      `SELECT c.*, u.nick_name AS created_by_name, cc.category_name,
              scp.id AS sales_pool_id,
              scp.pool_type AS sales_pool_type,
              scp.status AS sales_pool_status,
              scp.current_stage AS sales_pool_stage,
              su.nick_name AS sales_owner_user_name
       FROM customers c
       LEFT JOIN users u ON u.id = c.created_by
       LEFT JOIN customer_categories cc ON cc.id = c.category_id
       LEFT JOIN sales_customer_pool scp ON scp.id = (
         SELECT id FROM sales_customer_pool WHERE customer_id = c.id ORDER BY id DESC LIMIT 1
       )
       LEFT JOIN users su ON su.id = scp.owner_user_id
       WHERE 1=1${conditions}
       ORDER BY c.id DESC
       LIMIT ? OFFSET ?`
    , [...params, pageSize, offset])

    res.json({
      code: 200,
      message: '获取成功',
      data: { list: rows.map(toApi), total, page, pageSize }
    })
  } catch (error) {
    console.error('获取客户列表失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id)
  try {
    const row = await db.get(
      `SELECT c.*, u.nick_name AS created_by_name, cc.category_name,
              scp.id AS sales_pool_id,
              scp.pool_type AS sales_pool_type,
              scp.status AS sales_pool_status,
              scp.current_stage AS sales_pool_stage,
              su.nick_name AS sales_owner_user_name
       FROM customers c
       LEFT JOIN users u ON u.id = c.created_by
       LEFT JOIN customer_categories cc ON cc.id = c.category_id
       LEFT JOIN sales_customer_pool scp ON scp.id = (
         SELECT id FROM sales_customer_pool WHERE customer_id = c.id ORDER BY id DESC LIMIT 1
       )
       LEFT JOIN users su ON su.id = scp.owner_user_id
       WHERE c.id = ?`
    , [id])

    if (!row) return res.json({ code: 404, message: '客户不存在' })

    const isManager = req.user.roles.some(r => r === 'administrator' || r === 'admin')
    if (!isManager && row.created_by !== req.user.id) {
      return res.json({ code: 403, message: '无权查看该客户' })
    }

    res.json({ code: 200, message: '获取成功', data: toApi(row) })
  } catch (error) {
    console.error('获取客户详情失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

router.post('/', async (req, res) => {
  const b = req.body

  if (!b.name || !b.name.trim()) {
    return res.json({ code: 400, message: '客户名称不能为空' })
  }

  try {
    // 优先使用编码规则生成客户编号，失败则用前端传入或时间戳
    const customerNo = await resolveBusinessCode('customer', b.customerNo, 'KH')

    const existing = await db.get('SELECT id FROM customers WHERE customer_no = ?', [customerNo])
    if (existing) return res.json({ code: 400, message: '客户编号已存在' })

    await db.transaction(async (conn) => {
      const result = await db.run(
        `INSERT INTO customers (customer_no, name, category_id, contact_name, contact_phone, email, province, city, district, address, bank_name, bank_account, tax_no, credit_limit, customer_level, status, remark, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      , [customerNo,
        b.name.trim(),
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
        b.creditLimit != null ? Number(b.creditLimit) : null,
        (b.customerLevel || '普通').trim(),
        b.status !== undefined ? Number(b.status) : 1,
        (b.remark || '').trim(),
        req.user.id])
      const customerId = Number(result.insertId)
      const poolId = shouldSyncToPublicPool(b.syncToPublicPool) ? ensurePublicCustomerPool(customerId, req.user.id) : null
      return { customerId, poolId }
    })
    res.json({ code: 200, message: '添加成功', data: { id: created.customerId, customerNo, salesPoolId: created.poolId } })
  } catch (error) {
    console.error('添加客户失败:', error.message)
    res.json({ code: 500, message: error.message || '添加失败' })
  }
})

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT * FROM customers WHERE id = ?', [id])
  if (!existing) return res.json({ code: 404, message: '客户不存在' })

  const isManager = req.user.roles.some(r => r === 'administrator' || r === 'admin')
  if (!isManager && existing.created_by !== req.user.id) {
    return res.json({ code: 403, message: '无权编辑该客户' })
  }

  const b = req.body

  try {
    await db.run(
      `UPDATE customers SET name=?, category_id=?, contact_name=?, contact_phone=?, email=?, province=?, city=?, district=?, address=?, bank_name=?, bank_account=?, tax_no=?, credit_limit=?, customer_level=?, status=?, remark=?, updated_at=NOW() WHERE id=?`
    , [b.name !== undefined ? String(b.name).trim() : existing.name,
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
      b.creditLimit !== undefined ? (b.creditLimit != null ? Number(b.creditLimit) : null) : existing.credit_limit,
      b.customerLevel !== undefined ? String(b.customerLevel).trim() : existing.customer_level,
      b.status !== undefined ? Number(b.status) : existing.status,
      b.remark !== undefined ? String(b.remark).trim() : existing.remark,
      id])
    res.json({ code: 200, message: '更新成功' })
  } catch (error) {
    console.error('更新客户失败:', error.message)
    res.json({ code: 500, message: '更新失败' })
  }
})

router.put('/:id/status', async (req, res) => {
  const id = Number(req.params.id)
  const { status } = req.body
  const existing = await db.get('SELECT * FROM customers WHERE id = ?', [id])
  if (!existing) return res.json({ code: 404, message: '客户不存在' })

  const isManager = req.user.roles.some(r => r === 'administrator' || r === 'admin')
  if (!isManager && existing.created_by !== req.user.id) {
    return res.json({ code: 403, message: '无权修改该客户状态' })
  }

  try {
    await db.run(
      `UPDATE customers SET status=?, updated_at=NOW() WHERE id=?`
    , [Number(status), id])
    res.json({ code: 200, message: '状态更新成功' })
  } catch (error) {
    console.error('更新客户状态失败:', error.message)
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
  const allCategories = await db.all('SELECT id, category_name FROM customer_categories')
  for (const cat of allCategories) {
    categoryCache[cat.category_name] = cat.id
  }

  
  

  await db.transaction(async (conn) => {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      const rowIndex = i + 1
      try {
        const no = (r.customerNo || '').trim()
        const name = (r.name || '').trim()

        if (!no) { errors.push(`第${rowIndex}行：客户编号不能为空`); continue }
        if (!name) { errors.push(`第${rowIndex}行：客户名称不能为空`); continue }

        if (await db.get('SELECT id FROM customers WHERE customer_no = ?', [no])) {
          errors.push(`第${rowIndex}行：客户编号 ${no} 已存在`)
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

        const result = await db.run(
    `INSERT INTO customers (customer_no, name, category_id, contact_name, contact_phone, email, province, city, district, address, bank_name, bank_account, tax_no, credit_limit, customer_level, status, remark, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  , [no,
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
          r.creditLimit != null ? Number(r.creditLimit) : null,
          (r.customerLevel || '普通').trim(),
          r.status !== undefined ? Number(r.status) : 1,
          (r.remark || '').trim(),
          req.user.id])
        if (shouldSyncToPublicPool(r.syncToPublicPool)) {
          ensurePublicCustomerPool(Number(result.insertId), req.user.id)
        }
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
    console.error('导入客户失败:', error.message)
    res.json({ code: 500, message: '导入失败：' + error.message })
  }
})

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT * FROM customers WHERE id = ?', [id])
  if (!existing) return res.json({ code: 404, message: '客户不存在' })

  const isManager = req.user.roles.some(r => r === 'administrator' || r === 'admin')
  if (!isManager && existing.created_by !== req.user.id) {
    return res.json({ code: 403, message: '无权删除该客户' })
  }

  const pool = await db.get('SELECT id, pool_type FROM sales_customer_pool WHERE customer_id = ? ORDER BY id DESC LIMIT 1', [id])
  if (pool) {
    return res.json({ code: 400, message: '该客户已进入销售客户池，请先在销售客户池中处理后再删除' })
  }

  try {
    await db.run('DELETE FROM customers WHERE id = ?', [id])
    res.json({ code: 200, message: '删除成功' })
  } catch (error) {
    console.error('删除客户失败:', error.message)
    res.json({ code: 500, message: '删除失败' })
  }
})

module.exports = router
