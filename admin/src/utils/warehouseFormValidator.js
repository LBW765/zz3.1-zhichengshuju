import { ElMessage } from 'element-plus'

function isEmpty(value) {
  return value === undefined || value === null || value === ''
}

function validateRows(rows, rules, emptyMessage) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return emptyMessage
  }

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]
    for (const rule of rules) {
      const value = row[rule.field]
      if (rule.required && isEmpty(value)) {
        return `第 ${index + 1} 行${rule.label}不能为空`
      }
      if (rule.positive && (!Number(value) || Number(value) <= 0)) {
        return `第 ${index + 1} 行${rule.label}必须大于 0`
      }
      if (rule.when && !rule.when(row)) continue
      if (rule.validator) {
        const message = rule.validator(row, index)
        if (message) return message
      }
    }
  }

  return ''
}

export function showWarehouseValidationMessage(message) {
  if (!message) return false
  ElMessage.warning(message)
  return true
}

export function validateReceiptForm(form) {
  if (isEmpty(form.warehouseId)) return '请选择入库仓库'
  return validateRows(form.items, [
    { field: 'materialId', label: '物料', required: true },
    { field: 'qty', label: '入库数量', positive: true }
  ], '请至少维护一条入库明细')
}

export function validateIssueForm(form) {
  if (isEmpty(form.warehouseId)) return '请选择出库仓库'
  return validateRows(form.items, [
    { field: 'materialId', label: '物料', required: true },
    { field: 'qty', label: '出库数量', positive: true }
  ], '请至少维护一条出库明细')
}

export function validateTransferForm(form) {
  if (isEmpty(form.sourceWarehouseId)) return '请选择调出仓库'
  if (isEmpty(form.targetWarehouseId)) return '请选择调入仓库'
  if (Number(form.sourceWarehouseId) === Number(form.targetWarehouseId)) {
    const hasDifferentLocation = (form.items || []).some(item =>
      Number(item.sourceAreaId || 0) !== Number(item.targetAreaId || 0) ||
      Number(item.sourceLocationId || 0) !== Number(item.targetLocationId || 0)
    )
    if (!hasDifferentLocation) return '调出位置和调入位置不能完全相同'
  }

  return validateRows(form.items, [
    { field: 'materialId', label: '物料', required: true },
    { field: 'qty', label: '调拨数量', positive: true },
    { field: 'sourceAreaId', label: '调出库区', required: true },
    { field: 'sourceLocationId', label: '调出库位', required: true },
    { field: 'targetAreaId', label: '调入库区', required: true },
    { field: 'targetLocationId', label: '调入库位', required: true },
    {
      field: 'sourceLocationId',
      label: '调拨位置',
      validator: row => {
        const sameWarehouse = Number(form.sourceWarehouseId) === Number(form.targetWarehouseId)
        const sameArea = Number(row.sourceAreaId || 0) === Number(row.targetAreaId || 0)
        const sameLocation = Number(row.sourceLocationId || 0) === Number(row.targetLocationId || 0)
        return sameWarehouse && sameArea && sameLocation ? '同一仓库内调拨时，调出库区/库位和调入库区/库位不能完全相同' : ''
      }
    }
  ], '请至少维护一条调拨明细')
}

export function validateStockCountForm(form) {
  if (isEmpty(form.warehouseId)) return '请选择盘点仓库'
  if (isEmpty(form.countScope)) return '请选择盘点范围'
  if (isEmpty(form.assigneeId)) return '请选择盘点人'
  if (isEmpty(form.planDate)) return '请选择计划日期'
  if (form.countScope === 'area' && isEmpty(form.areaId)) return '盘点范围为库区时，请选择库区'
  if (form.countScope === 'location') {
    if (isEmpty(form.areaId)) return '盘点范围为库位时，请先选择库区'
    if (isEmpty(form.locationId)) return '盘点范围为库位时，请选择库位'
  }
  if (form.countScope === 'material_category' && isEmpty(form.materialCategoryId)) return '盘点范围为物料分类时，请选择物料分类'
  return ''
}
