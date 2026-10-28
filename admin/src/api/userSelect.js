import request from '@/utils/request'

/**
 * 用户选择器:轻量列表(任何登录用户都能用,不受 admin 限制)
 * 用于「成员选择」「负责人选择」等下拉/选人场景
 */
export function searchUsers(params) {
  return request({ url: '/user-select', method: 'get', params })
}

export function getUsersByIds(ids) {
  return request({ url: '/user-select/by-ids', method: 'get', params: { ids: (ids || []).join(',') } })
}
