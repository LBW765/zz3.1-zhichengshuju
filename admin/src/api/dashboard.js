import request from '@/utils/request'

export function getDashboardStats() {
  return request({ url: '/dashboard/stats', method: 'get' })
}

export function getSystemStats() {
  return request({ url: '/dashboard/system-stats', method: 'get' })
}

export function getLoginRecords() {
  return request({ url: '/dashboard/login-records', method: 'get' })
}

export function getWidgets() {
  return request({ url: '/dashboard/widgets', method: 'get' })
}
