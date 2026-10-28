const normalizeUrl = (url = '') => {
  if (/^https?:\/\//.test(url)) return url
  const baseURL = import.meta.env.VITE_APP_BASE_API || '/api'
  return `${baseURL}${url}`
}

const redirectToLogin = () => {
  const pages = getCurrentPages()
  const currentRoute = pages[pages.length - 1]?.route

  if (currentRoute && currentRoute !== 'pages/login/index') {
    uni.reLaunch({
      url: '/pages/login/index'
    })
  }
}

const request = (options = {}) => {
  const token = uni.getStorageSync('template-app-token') || ''

  return new Promise((resolve, reject) => {
    uni.request({
      timeout: 10000,
      ...options,
      url: normalizeUrl(options.url),
      header: {
        ...(options.header || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      success: (response) => {
        const res = response.data || {}

        if (res.code === 200) {
          resolve(res)
          return
        }

        if (res.code === 401) {
          uni.removeStorageSync('template-app-token')
          uni.showToast({
            title: res.message || '登录已失效',
            icon: 'none'
          })
          redirectToLogin()
        } else {
          uni.showToast({
            title: res.message || '请求失败',
            icon: 'none'
          })
        }

        reject(new Error(res.message || 'Error'))
      },
      fail: (error) => {
        uni.showToast({
          title: error.errMsg || '网络异常',
          icon: 'none'
        })
        reject(error)
      }
    })
  })
}

export default request
