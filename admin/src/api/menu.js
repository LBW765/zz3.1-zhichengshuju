import request from '@/utils/request'

export function getMenus() {
  return request({
    url: '/menus',
    method: 'get'
  })
}

export function createMenu(data) {
  return request({
    url: '/menus',
    method: 'post',
    data
  })
}

export function updateMenu(id, data) {
  return request({
    url: `/menus/${id}`,
    method: 'put',
    data
  })
}

export function deleteMenu(id) {
  return request({
    url: `/menus/${id}`,
    method: 'delete'
  })
}

export function getAccessibleMenus() {
  return request({
    url: '/menus/accessible',
    method: 'get'
  })
}

export function publishMenu(id, data) {
  return request({
    url: `/menus/${id}/publish`,
    method: 'post',
    data
  })
}

export function getMenuButtons(id) {
  return request({
    url: `/menus/${id}/buttons`,
    method: 'get'
  })
}
