import request from '@/utils/request'

/**
 * 获取按钮权限列表
 * @param {Object} params - 查询参数
 * @param {number} params.menuId - 菜单ID
 */
export function getPermissions(params) {
  return request({
    url: '/permissions',
    method: 'get',
    params
  })
}

/**
 * 新增按钮权限
 * @param {Object} data - 权限数据
 */
export function addPermission(data) {
  return request({
    url: '/permissions',
    method: 'post',
    data
  })
}

/**
 * 更新按钮权限
 * @param {number} id - 权限ID
 * @param {Object} data - 权限数据
 */
export function updatePermission(id, data) {
  return request({
    url: `/permissions/${id}`,
    method: 'put',
    data
  })
}

/**
 * 删除按钮权限
 * @param {number} id - 权限ID
 */
export function deletePermission(id) {
  return request({
    url: `/permissions/${id}`,
    method: 'delete'
  })
}
