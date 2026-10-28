import request from '@/utils/request'

/**
 * 获取部门列表
 */
export function getDepartments() {
  return request({
    url: '/system/departments',
    method: 'get'
  })
}

export const getDepartmentList = getDepartments

/**
 * 新增部门
 */
export function addDepartment(data) {
  return request({
    url: '/system/departments',
    method: 'post',
    data
  })
}

/**
 * 更新部门
 */
export function updateDepartment(id, data) {
  return request({
    url: `/system/departments/${id}`,
    method: 'put',
    data
  })
}

/**
 * 删除部门
 */
export function deleteDepartment(id) {
  return request({
    url: `/system/departments/${id}`,
    method: 'delete'
  })
}
