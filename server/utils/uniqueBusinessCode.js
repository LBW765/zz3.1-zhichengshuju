function ensureSafeIdentifier(identifier) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(`Invalid SQL identifier: ${identifier}`)
  }
  return identifier
}

function duplicateBusinessCodeMessage(label, value, type = '编码') {
  if (!type) return `${label}“${value}”已存在，请换一个${label}`
  return `${label}${type}“${value}”已存在，请换一个${type}`
}

async function getDuplicateBusinessCodeMessage(db, options) {
  const table = ensureSafeIdentifier(options.table)
  const field = ensureSafeIdentifier(options.field)
  const code = String(options.value || '').trim()
  if (!code) return ''

  const params = []
  let sql = `SELECT id FROM ${table} WHERE ${field} = ?`
  params.push(code)

  if (options.excludeId !== undefined && options.excludeId !== null) {
    sql += ' AND id != ?'
    params.push(Number(options.excludeId))
  }

  const scope = Array.isArray(options.scope) ? options.scope : []
  for (const item of scope) {
    sql += ` AND ${ensureSafeIdentifier(item.field)} = ?`
    params.push(item.value)
  }

  const duplicate = await db.get(sql, params)
  if (!duplicate) return ''
  return duplicateBusinessCodeMessage(options.label, code, options.type || '编码')
}

const BUSINESS_CODE_FALLBACKS = {
  customer: { table: 'customers', field: 'customer_no', label: '客户', type: '编号' },
  unit_group: { table: 'unit_groups', field: 'group_code', label: '单位组' },
  unit: { table: 'units', field: 'unit_code', label: '单位符号', type: '' },
  material_category: { table: 'material_categories', field: 'category_code', label: '物料分类' },
  material: { table: 'materials', field: 'material_code', label: '物料' },
  process: { table: 'processes', field: 'process_code', label: '工序' },
  process_route: { table: 'process_routes', field: 'route_code', label: '工艺路线' },
  supplier_category: { table: 'supplier_categories', field: 'category_code', label: '供应商分类' },
  supplier: { table: 'suppliers', field: 'supplier_code', label: '供应商' },
  warehouse: { table: 'warehouses', field: 'warehouse_code', label: '仓库' },
  warehouse_area: { table: 'warehouse_areas', field: 'area_code', label: '库区' },
  warehouse_location: { table: 'warehouse_locations', field: 'location_code', label: '库位' },
  warehouse_receipt: { table: 'warehouse_receipts', field: 'receipt_code', label: '入库单', type: '单号' },
  warehouse_issue: { table: 'warehouse_issues', field: 'issue_code', label: '出库单', type: '单号' },
  stock_transfer: { table: 'stock_transfers', field: 'transfer_code', label: '调拨单', type: '单号' },
  stock_count_task: { table: 'stock_count_tasks', field: 'task_code', label: '盘点任务', type: '单号' },
  bom: { table: 'boms', field: 'bom_code', label: 'BOM' },
  workshop: { table: 'workshops', field: 'workshop_code', label: '车间' },
  production_line: { table: 'production_lines', field: 'line_code', label: '产线' },
  work_team: { table: 'work_teams', field: 'team_code', label: '班组' },
  equipment_category: { table: 'equipment_categories', field: 'category_code', label: '设备分类' },
  equipment: { table: 'equipments', field: 'equipment_code', label: '设备' },
  service_provider_category: { table: 'service_provider_categories', field: 'category_code', label: '服务商分类' },
  service_provider: { table: 'service_providers', field: 'provider_code', label: '服务商' },
  safety_regulation_category: { table: 'safety_regulation_categories', field: 'category_code', label: '安全规程分类' },
  safety_regulation: { table: 'safety_regulations', field: 'regulation_code', label: '安全规程' },
  safety_course: { table: 'safety_courses', field: 'course_code', label: '培训课程' },
  safety_training_plan: { table: 'safety_training_plans', field: 'plan_code', label: '培训计划', type: '单号' },
  safety_training: { table: 'safety_trainings', field: 'training_code', label: '培训任务', type: '单号' },
  safety_inspection_scheme: { table: 'safety_inspection_schemes', field: 'scheme_code', label: '检查方案' },
  safety_inspection_plan: { table: 'safety_inspection_plans', field: 'plan_code', label: '检查计划', type: '单号' },
  safety_inspection: { table: 'safety_inspections', field: 'inspection_code', label: '检查任务', type: '单号' },
  equipment_inspection_scheme: { table: 'equipment_inspection_schemes', field: 'scheme_code', label: '设备点检方案' },
  equipment_inspection_plan: { table: 'equipment_inspection_plans', field: 'plan_code', label: '设备点检计划', type: '单号' },
  equipment_inspection_task: { table: 'equipment_inspection_tasks', field: 'task_code', label: '设备点检任务', type: '单号' },
  equipment_maintenance_scheme: { table: 'equipment_maintenance_schemes', field: 'scheme_code', label: '设备保养方案' },
  equipment_maintenance_plan: { table: 'equipment_maintenance_plans', field: 'plan_code', label: '设备保养计划', type: '单号' },
  equipment_maintenance_task: { table: 'equipment_maintenance_tasks', field: 'task_code', label: '设备保养任务', type: '单号' },
  equipment_repair_order: { table: 'equipment_repair_orders', field: 'repair_code', label: '设备维修工单', type: '单号' },
  equipment_repair_material_issue: { table: 'equipment_repair_material_issues', field: 'issue_apply_code', label: '维修领料', type: '单号' },
  equipment_repair_material_return: { table: 'equipment_repair_material_returns', field: 'return_apply_code', label: '维修退料', type: '单号' },
  hazard_source_category: { table: 'hazard_source_categories', field: 'category_code', label: '危险源分类' },
  emergency_plan_category: { table: 'emergency_plan_categories', field: 'category_code', label: '应急预案分类' },
  emergency_plan: { table: 'emergency_plans', field: 'plan_code', label: '应急预案' },
  emergency_drill: { table: 'emergency_drills', field: 'drill_code', label: '演练记录', type: '单号' },
  hazard_source: { table: 'hazard_sources', field: 'source_code', label: '危险源' },
  safety_hazard: { table: 'safety_hazards', field: 'hazard_code', label: '隐患', type: '单号' },
  hazardous_waste: { table: 'hazardous_wastes', field: 'waste_code', label: '危废记录', type: '单号' },
  safety_accident: { table: 'safety_accidents', field: 'accident_code', label: '事故记录', type: '单号' },
  purchase_plan: { table: 'purchase_plans', field: 'plan_code', label: '采购计划', type: '单号' },
  purchase_inquiry: { table: 'purchase_inquiries', field: 'inquiry_code', label: '询价单', type: '单号' },
  supplier_quote: { table: 'supplier_quotes', field: 'quote_code', label: '供应商报价', type: '单号' },
  purchase_contract: { table: 'purchase_contracts', field: 'contract_code', label: '采购合同', type: '单号' },
  purchase_order: { table: 'purchase_orders', field: 'order_code', label: '采购订单', type: '单号' },
  sales_customer_pool: { table: 'sales_customer_pool', field: 'pool_code', label: '客户池记录', type: '单号' },
  sales_opportunity: { table: 'sales_opportunities', field: 'opportunity_code', label: '商机' },
  sales_quote: { table: 'sales_quotes', field: 'quote_code', label: '销售报价', type: '单号' },
  sales_contract: { table: 'sales_contracts', field: 'contract_code', label: '销售合同', type: '单号' },
  sales_order: { table: 'sales_orders', field: 'order_code', label: '销售订单', type: '单号' },
  after_sale_ticket: { table: 'after_sale_tickets', field: 'ticket_code', label: '售后工单', type: '单号' },
  after_sale_dispatch: { table: 'after_sale_dispatches', field: 'dispatch_code', label: '服务执行单', type: '单号' },
  after_sale_exchange: { table: 'after_sale_exchanges', field: 'exchange_code', label: '退换补发单', type: '单号' },
  after_sale_refund: { table: 'after_sale_refunds', field: 'refund_code', label: '退款单', type: '单号' },
  after_sale_visit: { table: 'after_sale_visits', field: 'visit_code', label: '回访单', type: '单号' },
  logistics_waybill: { table: 'logistics_waybills', field: 'waybill_internal_no', label: '第三方运单', type: '单号' },
  logistics_task: { table: 'logistics_tasks', field: 'task_no', label: '运输任务', type: '单号' },
  logistics_driver: { table: 'logistics_drivers', field: 'driver_no', label: '司机', type: '编码' },
  logistics_vehicle: { table: 'logistics_vehicles', field: 'vehicle_no', label: '车辆', type: '编码' },
  logistics_carrier: { table: 'logistics_carriers', field: 'carrier_no', label: '承运商', type: '编码' },
  logistics_provider_config: { table: 'logistics_provider_configs', field: 'config_no', label: '物流接口配置', type: '编号' }
}

async function getBusinessCodeMeta(db, ruleCode) {
  const fallback = BUSINESS_CODE_FALLBACKS[ruleCode]
  let rule = null
  try {
    rule = await db.get('SELECT table_name, code_field FROM code_rules WHERE code = ?', [ruleCode])
  } catch (_e) {
    rule = null
  }
  return {
    ...(fallback || {}),
    table: rule?.table_name || fallback?.table,
    field: rule?.code_field || fallback?.field
  }
}

function getDuplicateMessageByRule(db, ruleCode, value, options = {}) {
  const meta = getBusinessCodeMeta(db, ruleCode)
  if (!meta.table || !meta.field) return ''
  return getDuplicateBusinessCodeMessage(db, {
    table: meta.table,
    field: meta.field,
    value,
    label: options.label || meta.label || '业务',
    type: options.type !== undefined ? options.type : (meta.type || '编码'),
    excludeId: options.excludeId,
    scope: options.scope
  })
}

function isSqliteUniqueConstraintError(error) {
  return Boolean(error && (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || /UNIQUE constraint failed/i.test(error.message || '')))
}

module.exports = {
  duplicateBusinessCodeMessage,
  getDuplicateBusinessCodeMessage,
  getDuplicateMessageByRule,
  isSqliteUniqueConstraintError
}
