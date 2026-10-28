import request from '@/utils/request'

// ——— 单位组 ———

export function getUnitGroupList(params) {
  return request({ url: '/basic-data/unit-group', method: 'get', params })
}

export function createUnitGroup(data) {
  return request({ url: '/basic-data/unit-group', method: 'post', data })
}

export function updateUnitGroup(id, data) {
  return request({ url: `/basic-data/unit-group/${id}`, method: 'put', data })
}

export function updateUnitGroupStatus(id, data) {
  return request({ url: `/basic-data/unit-group/${id}/status`, method: 'put', data })
}

export function deleteUnitGroup(id) {
  return request({ url: `/basic-data/unit-group/${id}`, method: 'delete' })
}

export function importUnitGroup(rows) {
  return request({ url: '/basic-data/unit-group/import', method: 'post', data: { rows } })
}

// ——— 计量单位 ———

export function getUnitList(params) {
  return request({ url: '/basic-data/unit', method: 'get', params })
}

export function createUnit(data) {
  return request({ url: '/basic-data/unit', method: 'post', data })
}

export function updateUnit(id, data) {
  return request({ url: `/basic-data/unit/${id}`, method: 'put', data })
}

export function updateUnitStatus(id, data) {
  return request({ url: `/basic-data/unit/${id}/status`, method: 'put', data })
}

export function deleteUnit(id) {
  return request({ url: `/basic-data/unit/${id}`, method: 'delete' })
}

export function importUnit(rows) {
  return request({ url: '/basic-data/unit/import', method: 'post', data: { rows } })
}

// ——— 物料分类 ———

export function getMaterialCategoryList(params) {
  return request({ url: '/basic-data/material-category', method: 'get', params })
}

export function createMaterialCategory(data) {
  return request({ url: '/basic-data/material-category', method: 'post', data })
}

export function updateMaterialCategory(id, data) {
  return request({ url: `/basic-data/material-category/${id}`, method: 'put', data })
}

export function deleteMaterialCategory(id) {
  return request({ url: `/basic-data/material-category/${id}`, method: 'delete' })
}

export function importMaterialCategory(rows) {
  return request({ url: '/basic-data/material-category/import', method: 'post', data: { rows } })
}

export function exportMaterialCategory(data) {
  return request({ url: '/basic-data/material-category/export', method: 'post', data })
}

// ——— 物料档案 ———

export function getMaterialList(params) {
  return request({ url: '/basic-data/material', method: 'get', params })
}

export function getMaterialDetail(id) {
  return request({ url: `/basic-data/material/${id}`, method: 'get' })
}

export function createMaterial(data) {
  return request({ url: '/basic-data/material', method: 'post', data })
}

export function updateMaterial(id, data) {
  return request({ url: `/basic-data/material/${id}`, method: 'put', data })
}

export function updateMaterialStatus(id, data) {
  return request({ url: `/basic-data/material/${id}/status`, method: 'put', data })
}

export function deleteMaterial(id) {
  return request({ url: `/basic-data/material/${id}`, method: 'delete' })
}

export function importMaterial(rows) {
  return request({ url: '/basic-data/material/import', method: 'post', data: { rows } })
}

export function exportMaterial(data) {
  return request({ url: '/basic-data/material/export', method: 'post', data })
}

// ——— 工序 ———

export function getProcessList(params) {
  return request({ url: '/basic-data/process', method: 'get', params })
}

export function getProcessDetail(id) {
  return request({ url: `/basic-data/process/${id}`, method: 'get' })
}

export function createProcess(data) {
  return request({ url: '/basic-data/process', method: 'post', data })
}

export function updateProcess(id, data) {
  return request({ url: `/basic-data/process/${id}`, method: 'put', data })
}

export function updateProcessStatus(id, data) {
  return request({ url: `/basic-data/process/${id}/status`, method: 'put', data })
}

export function deleteProcess(id) {
  return request({ url: `/basic-data/process/${id}`, method: 'delete' })
}

export function importProcess(rows) {
  return request({ url: '/basic-data/process/import', method: 'post', data: { rows } })
}

export function addProcessAttachment(id, data) {
  return request({ url: `/basic-data/process/${id}/attachments`, method: 'post', data })
}

export function deleteProcessAttachment(id, attachmentId) {
  return request({ url: `/basic-data/process/${id}/attachments/${attachmentId}`, method: 'delete' })
}

// ——— 工艺路线 ———

export function getProcessRouteList(params) {
  return request({ url: '/basic-data/process-route', method: 'get', params })
}

export function getProcessRouteDetail(id) {
  return request({ url: `/basic-data/process-route/${id}`, method: 'get' })
}

export function createProcessRoute(data) {
  return request({ url: '/basic-data/process-route', method: 'post', data })
}

export function updateProcessRoute(id, data) {
  return request({ url: `/basic-data/process-route/${id}`, method: 'put', data })
}

export function updateProcessRouteStatus(id, data) {
  return request({ url: `/basic-data/process-route/${id}/status`, method: 'put', data })
}

export function deleteProcessRoute(id) {
  return request({ url: `/basic-data/process-route/${id}`, method: 'delete' })
}

export function importProcessRoute(rows) {
  return request({ url: '/basic-data/process-route/import', method: 'post', data: { rows } })
}

// ——— BOM ———

export function getBomList(params) {
  return request({ url: '/basic-data/bom', method: 'get', params })
}

export function getBomDetail(id) {
  return request({ url: `/basic-data/bom/${id}`, method: 'get' })
}

export function getBomTree(id) {
  return request({ url: `/basic-data/bom/${id}/tree`, method: 'get' })
}

export function createBom(data) {
  return request({ url: '/basic-data/bom', method: 'post', data })
}

export function updateBom(id, data) {
  return request({ url: `/basic-data/bom/${id}`, method: 'put', data })
}

export function updateBomStatus(id, data) {
  return request({ url: `/basic-data/bom/${id}/status`, method: 'put', data })
}

export function deleteBom(id) {
  return request({ url: `/basic-data/bom/${id}`, method: 'delete' })
}

export function importBom(rows) {
  return request({ url: '/basic-data/bom/import', method: 'post', data: { rows } })
}

export function checkMaterialBom(materialId) {
  return request({ url: `/basic-data/bom/check-material-bom/${materialId}`, method: 'get' })
}

export function getBomItemsByMaterial(materialId) {
  return request({ url: `/basic-data/bom/by-material/${materialId}/items`, method: 'get' })
}

export function getBomsByMaterial(materialId) {
  return request({ url: `/basic-data/bom/by-material/${materialId}`, method: 'get' })
}

export function getBomHints(id) {
  return request({ url: `/basic-data/bom/${id}/hints`, method: 'get' })
}

export function dismissBomHints(id) {
  return request({ url: `/basic-data/bom/${id}/hints/dismiss`, method: 'put' })
}

export function syncBomFromMaterial(bomId, materialId) {
  return request({ url: `/basic-data/bom/${bomId}/sync-from/${materialId}`, method: 'post' })
}

// ——— 车间 ———

export function getWorkshopList(params) {
  return request({ url: '/basic-data/workshop', method: 'get', params })
}

export function getWorkshopDetail(id) {
  return request({ url: `/basic-data/workshop/${id}`, method: 'get' })
}

export function createWorkshop(data) {
  return request({ url: '/basic-data/workshop', method: 'post', data })
}

export function updateWorkshop(id, data) {
  return request({ url: `/basic-data/workshop/${id}`, method: 'put', data })
}

export function updateWorkshopStatus(id, data) {
  return request({ url: `/basic-data/workshop/${id}/status`, method: 'put', data })
}

export function deleteWorkshop(id) {
  return request({ url: `/basic-data/workshop/${id}`, method: 'delete' })
}

export function importWorkshop(rows) {
  return request({ url: '/basic-data/workshop/import', method: 'post', data: { rows } })
}

// ——— 产线 ———

export function getProductionLines(workshopId) {
  return request({ url: `/basic-data/workshop/${workshopId}/lines`, method: 'get' })
}

export function getProductionLineDetail(workshopId, lineId) {
  return request({ url: `/basic-data/workshop/${workshopId}/lines/${lineId}`, method: 'get' })
}

export function createProductionLine(workshopId, data) {
  return request({ url: `/basic-data/workshop/${workshopId}/lines`, method: 'post', data })
}

export function updateProductionLine(workshopId, lineId, data) {
  return request({ url: `/basic-data/workshop/${workshopId}/lines/${lineId}`, method: 'put', data })
}

export function deleteProductionLine(workshopId, lineId) {
  return request({ url: `/basic-data/workshop/${workshopId}/lines/${lineId}`, method: 'delete' })
}

// ——— 班组 ———

export function getWorkTeams(lineId) {
  return request({ url: `/basic-data/workshop/lines/${lineId}/teams`, method: 'get' })
}

export function getWorkTeamDetail(lineId, teamId) {
  return request({ url: `/basic-data/workshop/lines/${lineId}/teams/${teamId}`, method: 'get' })
}

export function createWorkTeam(lineId, data) {
  return request({ url: `/basic-data/workshop/lines/${lineId}/teams`, method: 'post', data })
}

export function updateWorkTeam(lineId, teamId, data) {
  return request({ url: `/basic-data/workshop/lines/${lineId}/teams/${teamId}`, method: 'put', data })
}

export function deleteWorkTeam(lineId, teamId) {
  return request({ url: `/basic-data/workshop/lines/${lineId}/teams/${teamId}`, method: 'delete' })
}

// ——— 班组人员 ———

export function addTeamMember(teamId, data) {
  return request({ url: `/basic-data/workshop/teams/${teamId}/members`, method: 'post', data })
}

export function removeTeamMember(teamId, memberId) {
  return request({ url: `/basic-data/workshop/teams/${teamId}/members/${memberId}`, method: 'delete' })
}

export function getAvailableUsers(teamId) {
  return request({ url: `/basic-data/workshop/teams/${teamId}/available-users`, method: 'get' })
}

export function getWorkshopUserOptions() {
  return request({ url: '/basic-data/workshop/user-options', method: 'get' })
}

export function getWorkshopEmployeeOptions() {
  return request({ url: '/basic-data/workshop/employee-options', method: 'get' })
}

// ——— 设备分类 ———

export function getEquipmentCategoryList(params) {
  return request({ url: '/basic-data/equipment-category', method: 'get', params })
}

export function createEquipmentCategory(data) {
  return request({ url: '/basic-data/equipment-category', method: 'post', data })
}

export function updateEquipmentCategory(id, data) {
  return request({ url: `/basic-data/equipment-category/${id}`, method: 'put', data })
}

export function deleteEquipmentCategory(id) {
  return request({ url: `/basic-data/equipment-category/${id}`, method: 'delete' })
}

export function importEquipmentCategory(rows) {
  return request({ url: '/basic-data/equipment-category/import', method: 'post', data: { rows } })
}

// ——— 设备档案 ———

export function getEquipmentList(params) {
  return request({ url: '/basic-data/equipment', method: 'get', params })
}

export function getEquipmentDetail(id) {
  return request({ url: `/basic-data/equipment/${id}`, method: 'get' })
}

export function createEquipment(data) {
  return request({ url: '/basic-data/equipment', method: 'post', data })
}

export function updateEquipment(id, data) {
  return request({ url: `/basic-data/equipment/${id}`, method: 'put', data })
}

export function updateEquipmentStatus(id, data) {
  return request({ url: `/basic-data/equipment/${id}/status`, method: 'put', data })
}

export function deleteEquipment(id) {
  return request({ url: `/basic-data/equipment/${id}`, method: 'delete' })
}

export function importEquipment(rows) {
  return request({ url: '/basic-data/equipment/import', method: 'post', data: { rows } })
}

// ——— 客户分类 ———

export function getCustomerCategoryList(params) {
  return request({ url: '/basic-data/customer-category', method: 'get', params })
}

export function createCustomerCategory(data) {
  return request({ url: '/basic-data/customer-category', method: 'post', data })
}

export function updateCustomerCategory(id, data) {
  return request({ url: `/basic-data/customer-category/${id}`, method: 'put', data })
}

export function deleteCustomerCategory(id) {
  return request({ url: `/basic-data/customer-category/${id}`, method: 'delete' })
}

export function importCustomerCategory(rows) {
  return request({ url: '/basic-data/customer-category/import', method: 'post', data: { rows } })
}

// ——— 服务商分类 ———

export function getServiceProviderCategoryList(params) {
  return request({ url: '/basic-data/service-provider-category', method: 'get', params })
}

export function createServiceProviderCategory(data) {
  return request({ url: '/basic-data/service-provider-category', method: 'post', data })
}

export function updateServiceProviderCategory(id, data) {
  return request({ url: `/basic-data/service-provider-category/${id}`, method: 'put', data })
}

export function deleteServiceProviderCategory(id) {
  return request({ url: `/basic-data/service-provider-category/${id}`, method: 'delete' })
}

export function importServiceProviderCategory(rows) {
  return request({ url: '/basic-data/service-provider-category/import', method: 'post', data: { rows } })
}

// ——— 服务商档案 ———

export function getServiceProviderList(params) {
  return request({ url: '/basic-data/service-provider', method: 'get', params })
}

export function getServiceProviderDetail(id) {
  return request({ url: `/basic-data/service-provider/${id}`, method: 'get' })
}

export function createServiceProvider(data) {
  return request({ url: '/basic-data/service-provider', method: 'post', data })
}

export function updateServiceProvider(id, data) {
  return request({ url: `/basic-data/service-provider/${id}`, method: 'put', data })
}

export function updateServiceProviderStatus(id, data) {
  return request({ url: `/basic-data/service-provider/${id}/status`, method: 'put', data })
}

export function deleteServiceProvider(id) {
  return request({ url: `/basic-data/service-provider/${id}`, method: 'delete' })
}

export function importServiceProvider(rows) {
  return request({ url: '/basic-data/service-provider/import', method: 'post', data: { rows } })
}

// ——— 通用附件 ———

export function getAttachmentList(params) {
  return request({ url: '/basic-data/attachment', method: 'get', params })
}

export function uploadAttachment(data) {
  return request({ url: '/basic-data/attachment/upload', method: 'post', data, headers: { 'Content-Type': 'multipart/form-data' } })
}

export function deleteAttachment(id) {
  return request({ url: `/basic-data/attachment/${id}`, method: 'delete' })
}
