import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login, logout, getUserInfo } from '@/api/user'
import Cookies from 'js-cookie'
import { ROLES, PLATFORMS, isAdministrator, canAccessAdminPlatform } from '@/constants/auth'
import { useAppStore } from '@/store/app'
import { usePermissionStore } from '@/store/permission'
import { useTagsViewStore } from '@/store/tagsView'

export const useUserStore = defineStore('user', () => {
  const token = ref(Cookies.get('Admin-Token') || '')
  const userInfo = ref({})
  const roles = ref([])
  const permissions = ref([])

  // 计算属性：是否是超级管理员
  const isAdmin = computed(() => isAdministrator(roles.value))

  // 计算属性：是否可以访问管理平台
  const canAccessAdmin = computed(() => canAccessAdminPlatform(roles.value))

  // 切换平台
  const switchPlatform = (platform) => {
    if (platform === PLATFORMS.ADMIN && !canAccessAdmin.value) {
      return false
    }
    const appStore = useAppStore()
    appStore.setPlatform(platform)
    return true
  }

  // 登录
  const userLogin = async (loginForm) => {
    try {
      const res = await login(loginForm)
      token.value = res.data.token
      Cookies.set('Admin-Token', res.data.token)
      return Promise.resolve(res)
    } catch (error) {
      return Promise.reject(error)
    }
  }

  // 获取用户信息
  const getInfo = async () => {
    try {
      const res = await getUserInfo()
      userInfo.value = res.data.user
      roles.value = res.data.roles
      permissions.value = res.data.permissions

      const appStore = useAppStore()
      const savedPlatform = localStorage.getItem('current-platform')
      if (savedPlatform === PLATFORMS.ADMIN && !canAccessAdminPlatform(res.data.roles)) {
        // 如果保存的是管理平台但用户无权限，降级到应用平台
        appStore.setPlatform(PLATFORMS.APP)
      } else if (savedPlatform) {
        // 优先使用用户保存的平台偏好
        appStore.setPlatform(savedPlatform)
      } else {
        // 默认所有用户（包括 administrator）都进入应用平台
        appStore.setPlatform(PLATFORMS.APP)
      }

      return Promise.resolve(res)
    } catch (error) {
      return Promise.reject(error)
    }
  }

  // 登出
  const userLogout = async () => {
    try {
      // 退出前保存用户名，方便二次登录
      if (userInfo.value.userName) {
        localStorage.setItem('last-login-username', userInfo.value.userName)
      }
      await logout()
      token.value = ''
      userInfo.value = {}
      roles.value = []
      permissions.value = []
      const appStore = useAppStore()
      appStore.setPlatform(PLATFORMS.APP)
      appStore.setActiveTab('')
      const permissionStore = usePermissionStore()
      const tagsViewStore = useTagsViewStore()
      permissionStore.resetRoutes()
      tagsViewStore.reset()
      Cookies.remove('Admin-Token')
      localStorage.removeItem('current-platform')
      return Promise.resolve()
    } catch (error) {
      return Promise.reject(error)
    }
  }

  // 权限校验
  const hasPermission = (permission) => {
    if (isAdmin.value) return true
    return permissions.value.includes(permission) || permissions.value.includes('*:*:*')
  }

  return {
    token,
    userInfo,
    roles,
    permissions,
    currentPlatform: computed(() => useAppStore().currentPlatform),
    isAdmin,
    canAccessAdmin,
    switchPlatform,
    userLogin,
    getInfo,
    userLogout,
    hasPermission,
    // 导出常量供组件使用
    PLATFORMS,
    ROLES
  }
})
