const express = require('express')
const { db } = require('../db')
const { authMiddleware, roleMiddleware } = require('../middleware/auth')
const { previewCode, previewNextCode } = require('../services/codeGenerator')

const router = express.Router()

router.use(authMiddleware)
router.use(roleMiddleware('administrator', 'admin'))

// 校验关联信息（表名和字段名）
async function validateRelation(tableName, codeField) {
  const warnings = []

  if (!tableName || !codeField) {
    return { valid: true, warnings: [] }
  }

  // 检查表是否存在
  const tableExists = await db.get(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name=?
  `, [tableName])

  if (!tableExists) {
    warnings.push(`表 [${tableName}] 不存在，可能是尚未创建的新业务表`)
  } else {
    // 表存在时，检查字段是否存在
    const columns = await db.all(`PRAGMA table_info(${tableName})`)
    const fieldExists = columns.some(col => col.name === codeField)

    if (!fieldExists) {
      warnings.push(`表 [${tableName}] 中不存在字段 [${codeField}]，可能是字段名填写错误`)
    }
  }

  return { valid: true, warnings }
}

// 列表（分页 + 搜索）
router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 10, code, name, enabled } = req.query
    const offset = (page - 1) * pageSize

    let whereClauses = []
    let params = []

    if (code) {
      whereClauses.push('code LIKE ?')
      params.push(`%${code}%`)
    }
    if (name) {
      whereClauses.push('name LIKE ?')
      params.push(`%${name}%`)
    }
    if (enabled !== undefined && enabled !== '') {
      whereClauses.push('enabled = ?')
      params.push(Number(enabled))
    }

    const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : ''

    
    const { total } = await db.get(`SELECT COUNT(*) as total FROM code_rules ${whereSQL}`, params)

    
    const list = await db.all(`
      SELECT r.*,
        (SELECT COUNT(*) FROM code_rule_segments WHERE rule_id = r.id) as segment_count
      FROM code_rules r
      ${whereSQL}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, Number(pageSize), offset])

    res.json({ code: 200, data: { list, total } })
  } catch (error) {
    res.json({ code: 500, message: error.message })
  }
})

// 详情（含完整段配置）
router.get('/:id', async (req, res) => {
  try {
    const rule = await db.get('SELECT * FROM code_rules WHERE id = ?', [req.params.id])
    if (!rule) {
      return res.json({ code: 404, message: '规则不存在' })
    }

    const segments = await db.all('SELECT * FROM code_rule_segments WHERE rule_id = ? ORDER BY sort ASC', [rule.id])

    // 解析 config JSON，并查询流水号状态
    const parsedSegments = segments.map(async seg => {
      const config = JSON.parse(seg.config)

      // 如果是流水号段，查询当前状态
      let sequences = []
      if (seg.type === 'sequence') {
        sequences = await db.all(`
          SELECT cycle_key, current_seq, updated_at
          FROM code_sequences
          WHERE segment_id = ?
          ORDER BY cycle_key DESC
          LIMIT 10
        `, [seg.id])
      }

      return {
        ...seg,
        config,
        sequences  // 新增：流水号状态数组
      }
    })

    res.json({ code: 200, data: { ...rule, segments: parsedSegments } })
  } catch (error) {
    res.json({ code: 500, message: error.message })
  }
})

// 新增（含段，整体保存）
router.post('/', async (req, res) => {
  try {
    const { code, name, description, enabled = 1, table_name, code_field, segments = [] } = req.body

    if (!code || !name) {
      return res.json({ code: 400, message: '业务键和名称不能为空' })
    }

    if (!segments.length) {
      return res.json({ code: 400, message: '至少需要配置一个段' })
    }

    // 检查 code 唯一性
    const existing = await db.get('SELECT id FROM code_rules WHERE code = ?', [code])
    if (existing) {
      return res.json({ code: 400, message: `业务键 [${code}] 已存在` })
    }

    // 校验关联信息
    const validation = validateRelation(table_name, code_field)

    // 生成示例编码
    let example = ''
    try {
      example = previewCode(segments)
    } catch (e) {
      // 预览失败不阻塞保存，留空
    }

    await db.transaction(async (conn) => {
      
      const { insertId } = await db.run(`
        INSERT INTO code_rules (code, name, description, enabled, example, table_name, code_field, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [code, name, description || '', enabled, example, table_name || null, code_field || null, req.user.id])
      const ruleId = Number(insertId)

      

      segments.forEach(async (seg, index) => {
        await db.run(`
        INSERT INTO code_rule_segments (rule_id, sort, type, config, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      `, [ruleId, seg.sort || index + 1, seg.type, JSON.stringify(seg.config), req.user.id])
      })

      return ruleId
    })

    res.json({
      code: 200,
      message: '创建成功',
      data: { id: result },
      warnings: validation.warnings
    })
  } catch (error) {
    res.json({ code: 500, message: error.message })
  }
})

// 编辑（含段，整体覆盖）
router.put('/:id', async (req, res) => {
  try {
    const { name, description, enabled, table_name, code_field, segments = [] } = req.body

    if (!name) {
      return res.json({ code: 400, message: '名称不能为空' })
    }

    if (!segments.length) {
      return res.json({ code: 400, message: '至少需要配置一个段' })
    }

    const rule = await db.get('SELECT * FROM code_rules WHERE id = ?', [req.params.id])
    if (!rule) {
      return res.json({ code: 404, message: '规则不存在' })
    }

    // 校验关联信息
    const validation = validateRelation(table_name, code_field)

    // 生成示例编码
    let example = ''
    try {
      example = previewCode(segments)
    } catch (e) {
      // 预览失败不阻塞保存
    }

    await db.transaction(async (conn) => {
      
      await db.run(`
        UPDATE code_rules
        SET name = ?, description = ?, enabled = ?, example = ?, table_name = ?, code_field = ?, updated_at = NOW()
        WHERE id = ?
      `, [name, description || '', enabled, example, table_name || null, code_field || null, req.params.id])

      // 删除旧段（级联删除会自动清理 code_sequences）
      await db.run('DELETE FROM code_rule_segments WHERE rule_id = ?', [req.params.id])

      // 插入新段

      segments.forEach(async (seg, index) => {
        await db.run(`
        INSERT INTO code_rule_segments (rule_id, sort, type, config, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      `, [req.params.id, seg.sort || index + 1, seg.type, JSON.stringify(seg.config), req.user.id])
      })
    })

    res.json({
      code: 200,
      message: '更新成功',
      warnings: validation.warnings
    })
  } catch (error) {
    res.json({ code: 500, message: error.message })
  }
})

// 删除（级联删除段和序号）
router.delete('/:id', async (req, res) => {
  try {
    const rule = await db.get('SELECT * FROM code_rules WHERE id = ?', [req.params.id])
    if (!rule) {
      return res.json({ code: 404, message: '规则不存在' })
    }

    // 检查是否已被使用（有序号记录）
    const usageCount = (await db.get(`
      SELECT COUNT(*) as count
      FROM code_sequences
      WHERE segment_id IN (SELECT id FROM code_rule_segments WHERE rule_id = ?)
    `, [req.params.id])).count

    if (usageCount > 0) {
      // 仅提示，不阻止删除（按故事文档要求）
      console.log(`规则 [${rule.code}] 已被使用 ${usageCount} 次，删除后历史序号将被清空`)
    }

    await db.run('DELETE FROM code_rules WHERE id = ?', [req.params.id])

    res.json({ code: 200, message: '删除成功' })
  } catch (error) {
    res.json({ code: 500, message: error.message })
  }
})

// 启用/停用切换
router.put('/:id/toggle', async (req, res) => {
  try {
    const rule = await db.get('SELECT * FROM code_rules WHERE id = ?', [req.params.id])
    if (!rule) {
      return res.json({ code: 404, message: '规则不存在' })
    }

    const newEnabled = rule.enabled ? 0 : 1
    await db.run(`UPDATE code_rules SET enabled = ?, updated_at = NOW() WHERE id = ?`, [newEnabled, req.params.id])

    res.json({ code: 200, message: newEnabled ? '已启用' : '已停用', data: { enabled: newEnabled } })
  } catch (error) {
    res.json({ code: 500, message: error.message })
  }
})

// 预览编码（不消费序号）
router.post('/preview', async (req, res) => {
  try {
    const { segments = [] } = req.body

    if (!segments.length) {
      return res.json({ code: 400, message: '段配置不能为空' })
    }

    const preview = previewCode(segments)

    res.json({ code: 200, data: { preview } })
  } catch (error) {
    res.json({ code: 500, message: error.message })
  }
})

module.exports = router

// 独立路由：获取下一个编码预览（所有已登录用户可调用，不受 admin roleMiddleware 限制）
const nextCodeRouter = express.Router()
nextCodeRouter.use(authMiddleware)
nextCodeRouter.get('/:ruleCode', async (req, res) => {
  try {
    const preview = previewNextCode(req.params.ruleCode)
    res.json({ code: 200, data: { preview } })
  } catch (error) {
    res.json({ code: 500, message: error.message })
  }
})

module.exports.nextCodeRouter = nextCodeRouter
