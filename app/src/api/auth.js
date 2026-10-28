import request from '@/utils/request'

export const login = (data) => request({
  url: '/login',
  method: 'POST',
  data
})

export const logout = () => request({
  url: '/logout',
  method: 'POST'
})
