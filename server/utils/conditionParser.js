/**
 * 条件树解析器
 * 将前端的条件树结构递归解析为 SQL WHERE 子句
 */

/**
 * 解析条件树为 SQL WHERE 子句
 * @param {Object} conditionTree - 条件树对象
 * @param {string} conditionTree.type - 'group' 或 'condition'
 * @param {string} conditionTree.logic - 'AND' 或 'OR' (仅 type='group' 时有效)
 * @param {Array} conditionTree.children - 子条件数组 (仅 type='group' 时有效)
 * @param {string} conditionTree.field - 字段名 (仅 type='condition' 时有效)
 * @param {string} conditionTree.operator - 操作符 (仅 type='condition' 时有效)
 * @param {*} conditionTree.value - 值 (仅 type='condition' 时有效)
 * @returns {Object} { sql: string, params: Array } - SQL 片段和参数数组
 */
function parseConditionTree(conditionTree) {
  if (!conditionTree) {
    return { sql: '1=1', params: [] }
  }

  if (conditionTree.type === 'group') {
    return parseGroup(conditionTree)
  } else if (conditionTree.type === 'condition') {
    return parseCondition(conditionTree)
  }

  return { sql: '1=1', params: [] }
}

/**
 * 解析条件组
 */
function parseGroup(group) {
  const { logic = 'AND', children = [] } = group

  if (children.length === 0) {
    return { sql: '1=1', params: [] }
  }

  const results = children.map(child => parseConditionTree(child))
  const sqlParts = results.map(r => r.sql)
  const allParams = results.flatMap(r => r.params)

  const sql = `(${sqlParts.join(` ${logic} `)})`
  return { sql, params: allParams }
}

/**
 * 解析单个条件
 */
function parseCondition(condition) {
  const { field, operator, value } = condition

  if (!field || !operator) {
    return { sql: '1=1', params: [] }
  }

  switch (operator) {
    case 'eq': // 等于
      return { sql: `${field} = ?`, params: [value] }

    case 'ne': // 不等于
      return { sql: `${field} != ?`, params: [value] }

    case 'gt': // 大于
      return { sql: `${field} > ?`, params: [value] }

    case 'gte': // 大于等于
      return { sql: `${field} >= ?`, params: [value] }

    case 'lt': // 小于
      return { sql: `${field} < ?`, params: [value] }

    case 'lte': // 小于等于
      return { sql: `${field} <= ?`, params: [value] }

    case 'like': // 包含
      return { sql: `${field} LIKE ?`, params: [`%${value}%`] }

    case 'notLike': // 不包含
      return { sql: `${field} NOT LIKE ?`, params: [`%${value}%`] }

    case 'startsWith': // 开头是
      return { sql: `${field} LIKE ?`, params: [`${value}%`] }

    case 'endsWith': // 结尾是
      return { sql: `${field} LIKE ?`, params: [`%${value}`] }

    case 'in': // 在列表中
      if (!Array.isArray(value) || value.length === 0) {
        return { sql: '1=0', params: [] }
      }
      const placeholders = value.map(() => '?').join(', ')
      return { sql: `${field} IN (${placeholders})`, params: value }

    case 'notIn': // 不在列表中
      if (!Array.isArray(value) || value.length === 0) {
        return { sql: '1=1', params: [] }
      }
      const notInPlaceholders = value.map(() => '?').join(', ')
      return { sql: `${field} NOT IN (${notInPlaceholders})`, params: value }

    case 'isNull': // 为空
      return { sql: `${field} IS NULL`, params: [] }

    case 'isNotNull': // 不为空
      return { sql: `${field} IS NOT NULL`, params: [] }

    case 'between': // 在范围内
      if (!Array.isArray(value) || value.length !== 2) {
        return { sql: '1=1', params: [] }
      }
      return { sql: `${field} BETWEEN ? AND ?`, params: value }

    default:
      return { sql: '1=1', params: [] }
  }
}

module.exports = {
  parseConditionTree
}
