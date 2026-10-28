import request from '@/utils/request'

// 登录
export function login(data) {
  return request({
    url: '/login',
    method: 'post',
    data
  })
}

// 获取用户信息
export function getUserInfo() {
  return request({
    url: '/user/info',
    method: 'get'
  })
}

// 登出
export function logout() {
  return request({
    url: '/logout',
    method: 'post'
  })
}

// 获取用户列表
export function getUserList(params) {
  return request({
    url: '/system/users',
    method: 'get',
    params
  })
}

// 新增用户
export function createUser(data) {
  return request({
    url: '/system/users',
    method: 'post',
    data
  })
}

// 编辑用户
export function updateUser(id, data) {
  return request({
    url: `/system/users/${id}`,
    method: 'put',
    data
  })
}

// 删除用户
export function deleteUser(id) {
  return request({
    url: `/system/users/${id}`,
    method: 'delete'
  })
}

// 修改用户状态
export function updateUserStatus(id, data) {
  return request({
    url: `/system/users/${id}/status`,
    method: 'put',
    data
  })
}

// 重置密码
export function resetUserPassword(id, data) {
  return request({
    url: `/system/users/${id}/reset-password`,
    method: 'put',
    data
  })
}

// 更新个人资料
export function updateProfile(data) {
  return request({
    url: '/user/profile',
    method: 'put',
    data
  })
}

// 修改密码
export function changePassword(data) {
  return request({
    url: '/user/password',
    method: 'put',
    data
  })
}
