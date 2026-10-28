import request from '@/utils/request'

export function getRoleList(params) {
  return request({ url: '/system/roles', method: 'get', params })
}

export function getAllRoles() {
  return request({ url: '/system/roles/all', method: 'get' })
}

export function createRole(data) {
  return request({ url: '/system/roles', method: 'post', data })
}

export function updateRole(id, data) {
  return request({ url: `/system/roles/${id}`, method: 'put', data })
}

export function deleteRole(id) {
  return request({ url: `/system/roles/${id}`, method: 'delete' })
}

export function updateRoleStatus(id, data) {
  return request({ url: `/system/roles/${id}/status`, method: 'put', data })
}

export function getRoleMenus(id) {
  return request({ url: `/system/roles/${id}/menus`, method: 'get' })
}

export function setRoleMenus(id, data) {
  return request({ url: `/system/roles/${id}/menus`, method: 'put', data })
}

export function getRolePermissions(id) {
  return request({ url: `/system/roles/${id}/permissions`, method: 'get' })
}

export function updateRolePermissions(id, permissionIds) {
  return request({ url: `/system/roles/${id}/permissions`, method: 'put', data: { permissionIds } })
}

export function getRoleDataScope(id) {
  return request({ url: `/system/roles/${id}/data-scope`, method: 'get' })
}

export function updateRoleDataScope(id, data) {
  return request({ url: `/system/roles/${id}/data-scope`, method: 'put', data })
}
