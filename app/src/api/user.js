import request from '@/utils/request'

export const getUserInfo = () => request({
  url: '/user/info',
  method: 'GET'
})

export const updateProfile = (data) => request({
  url: '/user/profile',
  method: 'PUT',
  data
})

export const updatePassword = (data) => request({
  url: '/user/password',
  method: 'PUT',
  data
})

export const uploadFile = (filePath) => {
  const token = uni.getStorageSync('template-app-token') || ''
  const baseURL = import.meta.env.VITE_APP_BASE_API || '/api'

  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${baseURL}/system/upload`,
      filePath,
      name: 'file',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success: (res) => {
        try {
          const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
          if (data.code === 200) {
            resolve(data)
          } else {
            uni.showToast({ title: data.message || '上传失败', icon: 'none' })
            reject(new Error(data.message))
          }
        } catch {
          reject(new Error('解析响应失败'))
        }
      },
      fail: (err) => {
        uni.showToast({ title: '上传失败', icon: 'none' })
        reject(err)
      }
    })
  })
}
