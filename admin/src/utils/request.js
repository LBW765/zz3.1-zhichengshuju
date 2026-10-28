import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/store/user'
import Cookies from 'js-cookie'

// 创建 axios 实例
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_API,
  timeout: 10000
})

// 请求拦截器
axiosInstance.interceptors.request.use(
  config => {
    const token = Cookies.get('Admin-Token')
    if (token) {
      config.headers['Authorization'] = 'Bearer ' + token
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
axiosInstance.interceptors.response.use(
  response => {
    if (response.config.responseType === 'blob') {
      return response
    }

    const res = response.data

    if (res.code !== 200) {
      // 登录接口的 401 只提示错误信息，不弹"过期"弹窗
      const isLoginApi = response.config.url?.includes('/login')

      if (res.code === 401 && !isLoginApi) {
        ElMessageBox.confirm('登录状态已过期，请重新登录', '系统提示', {
          confirmButtonText: '重新登录',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          const userStore = useUserStore()
          userStore.userLogout().then(() => {
            location.href = '/login'
          })
        })
      } else {
        ElMessage({
          message: res.message || 'Error',
          type: 'error',
          duration: 5000
        })
      }

      return Promise.reject(new Error(res.message || 'Error'))
    } else {
      return res
    }
  },
  error => {
    ElMessage({
      message: error.message || '请求失败',
      type: 'error',
      duration: 5000
    })
    return Promise.reject(error)
  }
)

export default axiosInstance
