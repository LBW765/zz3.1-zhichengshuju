import request from '@/utils/request'

export function getCustomerList(params) {
  return request({ url: '/customer', method: 'get', params })
}

export function getCustomerDetail(id) {
  return request({ url: `/customer/${id}`, method: 'get' })
}

export function createCustomer(data) {
  return request({ url: '/customer', method: 'post', data })
}

export function updateCustomer(id, data) {
  return request({ url: `/customer/${id}`, method: 'put', data })
}

export function updateCustomerStatus(id, data) {
  return request({ url: `/customer/${id}/status`, method: 'put', data })
}

export function deleteCustomer(id) {
  return request({ url: `/customer/${id}`, method: 'delete' })
}

export function importCustomer(rows) {
  return request({ url: '/customer/import', method: 'post', data: { rows } })
}
