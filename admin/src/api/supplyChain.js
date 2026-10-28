import request from '@/utils/request'

// ——— 供应商 ———

export function getSupplierList(params) {
  return request({ url: '/supply-chain/supplier', method: 'get', params })
}

export function getSupplierDetail(id) {
  return request({ url: `/supply-chain/supplier/${id}`, method: 'get' })
}

export function createSupplier(data) {
  return request({ url: '/supply-chain/supplier', method: 'post', data })
}

export function updateSupplier(id, data) {
  return request({ url: `/supply-chain/supplier/${id}`, method: 'put', data })
}

export function updateSupplierStatus(id, data) {
  return request({ url: `/supply-chain/supplier/${id}/status`, method: 'put', data })
}

export function deleteSupplier(id) {
  return request({ url: `/supply-chain/supplier/${id}`, method: 'delete' })
}

export function importSupplier(rows) {
  return request({ url: '/supply-chain/supplier/import', method: 'post', data: { rows } })
}

// ——— 供应商分类 ———

export function getSupplierCategoryList(params) {
  return request({ url: '/basic-data/supplier-category', method: 'get', params })
}

export function createSupplierCategory(data) {
  return request({ url: '/basic-data/supplier-category', method: 'post', data })
}

export function updateSupplierCategory(id, data) {
  return request({ url: `/basic-data/supplier-category/${id}`, method: 'put', data })
}

export function deleteSupplierCategory(id) {
  return request({ url: `/basic-data/supplier-category/${id}`, method: 'delete' })
}

export function importSupplierCategory(rows) {
  return request({ url: '/basic-data/supplier-category/import', method: 'post', data: { rows } })
}

// ——— 仓库 ———

export function getWarehouseList(params) {
  return request({ url: '/supply-chain/warehouse', method: 'get', params })
}

export function getWarehouseDetail(id) {
  return request({ url: `/supply-chain/warehouse/${id}`, method: 'get' })
}

export function createWarehouse(data) {
  return request({ url: '/supply-chain/warehouse', method: 'post', data })
}

export function updateWarehouse(id, data) {
  return request({ url: `/supply-chain/warehouse/${id}`, method: 'put', data })
}

export function updateWarehouseStatus(id, data) {
  return request({ url: `/supply-chain/warehouse/${id}/status`, method: 'put', data })
}

export function deleteWarehouse(id) {
  return request({ url: `/supply-chain/warehouse/${id}`, method: 'delete' })
}

export function importWarehouse(rows) {
  return request({ url: '/supply-chain/warehouse/import', method: 'post', data: { rows } })
}

// ——— 库区 ———

export function getWarehouseAreas(warehouseId) {
  return request({ url: `/supply-chain/warehouse/${warehouseId}/areas`, method: 'get' })
}

export function createWarehouseArea(warehouseId, data) {
  return request({ url: `/supply-chain/warehouse/${warehouseId}/areas`, method: 'post', data })
}

export function updateWarehouseArea(warehouseId, areaId, data) {
  return request({ url: `/supply-chain/warehouse/${warehouseId}/areas/${areaId}`, method: 'put', data })
}

export function deleteWarehouseArea(warehouseId, areaId) {
  return request({ url: `/supply-chain/warehouse/${warehouseId}/areas/${areaId}`, method: 'delete' })
}

// ——— 库位 ———

export function getWarehouseLocations(areaId) {
  return request({ url: `/supply-chain/warehouse/areas/${areaId}/locations`, method: 'get' })
}

export function createWarehouseLocation(areaId, data) {
  return request({ url: `/supply-chain/warehouse/areas/${areaId}/locations`, method: 'post', data })
}

export function updateWarehouseLocation(areaId, locationId, data) {
  return request({ url: `/supply-chain/warehouse/areas/${areaId}/locations/${locationId}`, method: 'put', data })
}

export function deleteWarehouseLocation(areaId, locationId) {
  return request({ url: `/supply-chain/warehouse/areas/${areaId}/locations/${locationId}`, method: 'delete' })
}

// 入库单

export function getWarehouseReceiptList(params) {
  return request({ url: '/supply-chain/warehouse-receipt', method: 'get', params })
}

export function getWarehouseReceiptDetail(id) {
  return request({ url: `/supply-chain/warehouse-receipt/${id}`, method: 'get' })
}

export function createWarehouseReceipt(data) {
  return request({ url: '/supply-chain/warehouse-receipt', method: 'post', data })
}

export function updateWarehouseReceipt(id, data) {
  return request({ url: `/supply-chain/warehouse-receipt/${id}`, method: 'put', data })
}

export function submitWarehouseReceipt(id) {
  return request({ url: `/supply-chain/warehouse-receipt/${id}/submit`, method: 'post' })
}

export function auditWarehouseReceipt(id) {
  return request({ url: `/supply-chain/warehouse-receipt/${id}/audit`, method: 'post' })
}

export function reverseWarehouseReceipt(id) {
  return request({ url: `/supply-chain/warehouse-receipt/${id}/reverse`, method: 'post' })
}

export function voidWarehouseReceipt(id) {
  return request({ url: `/supply-chain/warehouse-receipt/${id}/void`, method: 'post' })
}

// 出库单

export function getWarehouseIssueList(params) {
  return request({ url: '/supply-chain/warehouse-issue', method: 'get', params })
}

export function getWarehouseIssueDetail(id) {
  return request({ url: `/supply-chain/warehouse-issue/${id}`, method: 'get' })
}

export function createWarehouseIssue(data) {
  return request({ url: '/supply-chain/warehouse-issue', method: 'post', data })
}

export function updateWarehouseIssue(id, data) {
  return request({ url: `/supply-chain/warehouse-issue/${id}`, method: 'put', data })
}

export function submitWarehouseIssue(id) {
  return request({ url: `/supply-chain/warehouse-issue/${id}/submit`, method: 'post' })
}

export function recommendWarehouseIssue(data) {
  return request({ url: '/supply-chain/warehouse-issue/recommend', method: 'post', data })
}

export function recommendWarehouseIssueById(id) {
  return request({ url: `/supply-chain/warehouse-issue/${id}/recommend`, method: 'post' })
}

export function confirmWarehouseIssue(id, data) {
  return request({ url: `/supply-chain/warehouse-issue/${id}/confirm`, method: 'post', data })
}

export function confirmAndAuditWarehouseIssue(id, data) {
  return request({ url: `/supply-chain/warehouse-issue/${id}/confirm-audit`, method: 'post', data })
}

export function auditWarehouseIssue(id) {
  return request({ url: `/supply-chain/warehouse-issue/${id}/audit`, method: 'post' })
}

export function reverseWarehouseIssue(id) {
  return request({ url: `/supply-chain/warehouse-issue/${id}/reverse`, method: 'post' })
}

export function voidWarehouseIssue(id) {
  return request({ url: `/supply-chain/warehouse-issue/${id}/void`, method: 'post' })
}

// 即时库存 / 流水

export function getStockTransferList(params) {
  return request({ url: '/supply-chain/stock-transfer', method: 'get', params })
}

export function getStockTransferDetail(id) {
  return request({ url: `/supply-chain/stock-transfer/${id}`, method: 'get' })
}

export function createStockTransfer(data) {
  return request({ url: '/supply-chain/stock-transfer', method: 'post', data })
}

export function updateStockTransfer(id, data) {
  return request({ url: `/supply-chain/stock-transfer/${id}`, method: 'put', data })
}

export function submitStockTransfer(id) {
  return request({ url: `/supply-chain/stock-transfer/${id}/submit`, method: 'post' })
}

export function auditStockTransfer(id) {
  return request({ url: `/supply-chain/stock-transfer/${id}/audit`, method: 'post' })
}

export function reverseStockTransfer(id) {
  return request({ url: `/supply-chain/stock-transfer/${id}/reverse`, method: 'post' })
}

export function voidStockTransfer(id) {
  return request({ url: `/supply-chain/stock-transfer/${id}/void`, method: 'post' })
}

export function getStockCountTaskList(params) {
  return request({ url: '/supply-chain/stock-count', method: 'get', params })
}

export function getStockCountTaskDetail(id) {
  return request({ url: `/supply-chain/stock-count/${id}`, method: 'get' })
}

export function getStockCountAssignees() {
  return request({ url: '/supply-chain/stock-count/assignees', method: 'get' })
}

export function createStockCountTask(data) {
  return request({ url: '/supply-chain/stock-count', method: 'post', data })
}

export function updateStockCountTask(id, data) {
  return request({ url: `/supply-chain/stock-count/${id}`, method: 'put', data })
}

export function getStockInitialList(params) {
  return request({ url: '/supply-chain/stock-initial', method: 'get', params })
}

export function getStockInitialDetail(id) {
  return request({ url: `/supply-chain/stock-initial/${id}`, method: 'get' })
}

export function createStockInitial(data) {
  return request({ url: '/supply-chain/stock-initial', method: 'post', data })
}

export function updateStockInitial(id, data) {
  return request({ url: `/supply-chain/stock-initial/${id}`, method: 'put', data })
}

export function submitStockInitial(id) {
  return request({ url: `/supply-chain/stock-initial/${id}/submit`, method: 'post' })
}

export function auditStockInitial(id) {
  return request({ url: `/supply-chain/stock-initial/${id}/audit`, method: 'post' })
}

export function reverseStockInitial(id) {
  return request({ url: `/supply-chain/stock-initial/${id}/reverse`, method: 'post' })
}

export function voidStockInitial(id) {
  return request({ url: `/supply-chain/stock-initial/${id}/void`, method: 'post' })
}

export function importStockInitial(rows) {
  return request({ url: '/supply-chain/stock-initial/import', method: 'post', data: { rows } })
}

// 采购

export function getPurchasePlanList(params) {
  return request({ url: '/supply-chain/purchase-plan', method: 'get', params })
}

export function getPurchasePlanDetail(id) {
  return request({ url: `/supply-chain/purchase-plan/${id}`, method: 'get' })
}

export function getPurchasePlanDefaultContext() {
  return request({ url: '/supply-chain/purchase-plan/default-context', method: 'get' })
}

export function createPurchasePlan(data) {
  return request({ url: '/supply-chain/purchase-plan', method: 'post', data })
}

export function updatePurchasePlan(id, data) {
  return request({ url: `/supply-chain/purchase-plan/${id}`, method: 'put', data })
}

export function auditPurchasePlan(id) {
  return request({ url: `/supply-chain/purchase-plan/${id}/audit`, method: 'post' })
}

export function reversePurchasePlan(id) {
  return request({ url: `/supply-chain/purchase-plan/${id}/reverse`, method: 'post' })
}

export function closePurchasePlan(id) {
  return request({ url: `/supply-chain/purchase-plan/${id}/close`, method: 'post' })
}

export function voidPurchasePlan(id) {
  return request({ url: `/supply-chain/purchase-plan/${id}/void`, method: 'post' })
}

export function previewPurchasePlanOrders(planIds) {
  return request({ url: '/supply-chain/purchase-plan/create-orders/preview', method: 'post', data: { planIds } })
}

export function createPurchasePlanOrders(planIds) {
  return request({ url: '/supply-chain/purchase-plan/create-orders', method: 'post', data: { planIds } })
}

export function getPurchaseInquiryList(params) {
  return request({ url: '/supply-chain/purchase-inquiry', method: 'get', params })
}

export function getPurchaseInquiryDetail(id) {
  return request({ url: `/supply-chain/purchase-inquiry/${id}`, method: 'get' })
}

export function createPurchaseInquiry(data) {
  return request({ url: '/supply-chain/purchase-inquiry', method: 'post', data })
}

export function updatePurchaseInquiry(id, data) {
  return request({ url: `/supply-chain/purchase-inquiry/${id}`, method: 'put', data })
}

export function publishPurchaseInquiry(id, data) {
  return request({ url: `/supply-chain/purchase-inquiry/${id}/publish`, method: 'post', data })
}

export function getSupplierQuoteList(params) {
  return request({ url: '/supply-chain/supplier-quote', method: 'get', params })
}

export function getSupplierQuoteDetail(id) {
  return request({ url: `/supply-chain/supplier-quote/${id}`, method: 'get' })
}

export function updateSupplierQuote(id, data) {
  return request({ url: `/supply-chain/supplier-quote/${id}`, method: 'put', data })
}

export function submitSupplierQuote(id, data) {
  return request({ url: `/supply-chain/supplier-quote/${id}/submit`, method: 'post', data })
}

export function createPurchaseOrderFromQuote(id, data) {
  return request({ url: `/supply-chain/supplier-quote/${id}/create-order`, method: 'post', data })
}

export function getPurchaseContractList(params) {
  return request({ url: '/supply-chain/purchase-contract', method: 'get', params })
}

export function getPurchaseContractDetail(id) {
  return request({ url: `/supply-chain/purchase-contract/${id}`, method: 'get' })
}

export function createPurchaseContract(data) {
  return request({ url: '/supply-chain/purchase-contract', method: 'post', data })
}

export function updatePurchaseContract(id, data) {
  return request({ url: `/supply-chain/purchase-contract/${id}`, method: 'put', data })
}

export function auditPurchaseContract(id) {
  return request({ url: `/supply-chain/purchase-contract/${id}/audit`, method: 'post' })
}

export function reversePurchaseContract(id) {
  return request({ url: `/supply-chain/purchase-contract/${id}/reverse`, method: 'post' })
}

export function closePurchaseContract(id) {
  return request({ url: `/supply-chain/purchase-contract/${id}/close`, method: 'post' })
}

export function voidPurchaseContract(id) {
  return request({ url: `/supply-chain/purchase-contract/${id}/void`, method: 'post' })
}

export function getPurchaseOrderList(params) {
  return request({ url: '/supply-chain/purchase-order', method: 'get', params })
}

export function getPurchaseOrderDetail(id) {
  return request({ url: `/supply-chain/purchase-order/${id}`, method: 'get' })
}

export function createPurchaseOrder(data) {
  return request({ url: '/supply-chain/purchase-order', method: 'post', data })
}

export function updatePurchaseOrder(id, data) {
  return request({ url: `/supply-chain/purchase-order/${id}`, method: 'put', data })
}

export function auditPurchaseOrder(id) {
  return request({ url: `/supply-chain/purchase-order/${id}/audit`, method: 'post' })
}

export function reversePurchaseOrder(id) {
  return request({ url: `/supply-chain/purchase-order/${id}/reverse`, method: 'post' })
}

export function closePurchaseOrder(id) {
  return request({ url: `/supply-chain/purchase-order/${id}/close`, method: 'post' })
}

export function voidPurchaseOrder(id) {
  return request({ url: `/supply-chain/purchase-order/${id}/void`, method: 'post' })
}

export function createPurchaseReceiptFromOrder(id, data) {
  return request({ url: `/supply-chain/purchase-order/${id}/create-receipt`, method: 'post', data })
}

export function getPurchaseReceiptList(params) {
  return request({ url: '/supply-chain/purchase-receipt', method: 'get', params })
}

export function getPurchaseReceiptDetail(id) {
  return request({ url: `/supply-chain/purchase-receipt/${id}`, method: 'get' })
}

export function getPurchaseReturnList(params) {
  return request({ url: '/supply-chain/purchase-return', method: 'get', params })
}

export function getPurchaseReturnDetail(id) {
  return request({ url: `/supply-chain/purchase-return/${id}`, method: 'get' })
}

export function createPurchaseReturn(data) {
  return request({ url: '/supply-chain/purchase-return', method: 'post', data })
}

export function startStockCountTask(id) {
  return request({ url: `/supply-chain/stock-count/${id}/start`, method: 'post' })
}

export function confirmStockCountTask(id, data) {
  return request({ url: `/supply-chain/stock-count/${id}/confirm`, method: 'post', data })
}

export function finishStockCountTask(id) {
  return request({ url: `/supply-chain/stock-count/${id}/finish`, method: 'post' })
}

export function voidStockCountTask(id) {
  return request({ url: `/supply-chain/stock-count/${id}/void`, method: 'post' })
}

export function getStockBalanceList(params) {
  return request({ url: '/supply-chain/stock-balance', method: 'get', params })
}

export function getStockTransactionList(params) {
  return request({ url: '/supply-chain/stock-transaction', method: 'get', params })
}

export function getStockBatchList(params) {
  return request({ url: '/supply-chain/stock-batch', method: 'get', params })
}

export function getStockBatchDetail(id) {
  return request({ url: `/supply-chain/stock-batch/${id}`, method: 'get' })
}

export function getStockReportWarning(params) {
  return request({ url: '/supply-chain/stock-report/warning', method: 'get', params })
}

// 物流管理

export function getLogisticsCarrierList(params) {
  return request({ url: '/supply-chain/logistics/carriers', method: 'get', params })
}

export function createLogisticsCarrier(data) {
  return request({ url: '/supply-chain/logistics/carriers', method: 'post', data })
}

export function updateLogisticsCarrier(id, data) {
  return request({ url: `/supply-chain/logistics/carriers/${id}`, method: 'put', data })
}

export function deleteLogisticsCarrier(id) {
  return request({ url: `/supply-chain/logistics/carriers/${id}`, method: 'delete' })
}

export function getLogisticsDriverList(params) {
  return request({ url: '/supply-chain/logistics/drivers', method: 'get', params })
}

export function createLogisticsDriver(data) {
  return request({ url: '/supply-chain/logistics/drivers', method: 'post', data })
}

export function updateLogisticsDriver(id, data) {
  return request({ url: `/supply-chain/logistics/drivers/${id}`, method: 'put', data })
}

export function deleteLogisticsDriver(id) {
  return request({ url: `/supply-chain/logistics/drivers/${id}`, method: 'delete' })
}

export function getLogisticsVehicleList(params) {
  return request({ url: '/supply-chain/logistics/vehicles', method: 'get', params })
}

export function createLogisticsVehicle(data) {
  return request({ url: '/supply-chain/logistics/vehicles', method: 'post', data })
}

export function updateLogisticsVehicle(id, data) {
  return request({ url: `/supply-chain/logistics/vehicles/${id}`, method: 'put', data })
}

export function deleteLogisticsVehicle(id) {
  return request({ url: `/supply-chain/logistics/vehicles/${id}`, method: 'delete' })
}

export function getLogisticsProviderConfigList(params) {
  return request({ url: '/supply-chain/logistics/provider-configs', method: 'get', params })
}

export function createLogisticsProviderConfig(data) {
  return request({ url: '/supply-chain/logistics/provider-configs', method: 'post', data })
}

export function updateLogisticsProviderConfig(id, data) {
  return request({ url: `/supply-chain/logistics/provider-configs/${id}`, method: 'put', data })
}

export function getLogisticsWarehouseSource(code) {
  return request({ url: `/supply-chain/logistics/warehouse-source/${encodeURIComponent(code)}`, method: 'get' })
}

export function getLogisticsWaybillList(params) {
  return request({ url: '/supply-chain/logistics/waybills', method: 'get', params })
}

export function getLogisticsWaybillDetail(id) {
  return request({ url: `/supply-chain/logistics/waybills/${id}`, method: 'get' })
}

export function createLogisticsWaybill(data) {
  return request({ url: '/supply-chain/logistics/waybills', method: 'post', data })
}

export function importLogisticsWaybill(rows) {
  return request({ url: '/supply-chain/logistics/waybills/import', method: 'post', data: { rows } })
}

export function addLogisticsWaybillEvent(id, data) {
  return request({ url: `/supply-chain/logistics/waybills/${id}/events`, method: 'post', data })
}

export function getLogisticsTaskList(params) {
  return request({ url: '/supply-chain/logistics/tasks', method: 'get', params })
}

export function getLogisticsTaskDetail(id) {
  return request({ url: `/supply-chain/logistics/tasks/${id}`, method: 'get' })
}

export function createLogisticsTask(data) {
  return request({ url: '/supply-chain/logistics/tasks', method: 'post', data })
}

export function addLogisticsTaskEvent(id, data) {
  return request({ url: `/supply-chain/logistics/tasks/${id}/events`, method: 'post', data })
}

export function getLogisticsReportOverview(params) {
  return request({ url: '/supply-chain/logistics/report/overview', method: 'get', params })
}
