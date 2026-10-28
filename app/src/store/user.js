import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { login, logout } from '@/api/auth'
import { getUserInfo, updateProfile, updatePassword } from '@/api/user'
import { getToken, removeToken, setToken } from '@/utils/auth'
import { isAdministrator, PLATFORMS } from '@/constants/auth'

export const useUserStore = defineStore('user', () => {
  const token = ref(getToken())
  const userInfo = ref({})
  const roles = ref([])
  const permissions = ref([])

  const isAdmin = computed(() => isAdministrator(roles.value))

  const userLogin = async (payload) => {
    const res = await login(payload)
    token.value = res.data.token
    setToken(res.data.token)
    return res
  }

  const fetchUserInfo = async () => {
    const res = await getUserInfo()
    userInfo.value = res.data.user || {}
    roles.value = res.data.roles || []
    permissions.value = res.data.permissions || []
    return res
  }

  const saveProfile = async (payload) => {
    const res = await updateProfile(payload)
    // 本地同步更新，避免重新请求
    userInfo.value = { ...userInfo.value, ...payload }
    return res
  }

  const changePassword = async (payload) => {
    return await updatePassword(payload)
  }

  const clearUserState = () => {
    token.value = ''
    userInfo.value = {}
    roles.value = []
    permissions.value = []
    removeToken()
  }

  const userLogout = async () => {
    try {
      await logout()
    } finally {
      clearUserState()
    }
  }

  const hasLogin = computed(() => !!token.value)
  const currentPlatform = computed(() => (isAdmin.value ? PLATFORMS.ADMIN : PLATFORMS.APP))

  return {
    token,
    userInfo,
    roles,
    permissions,
    hasLogin,
    isAdmin,
    currentPlatform,
    userLogin,
    fetchUserInfo,
    saveProfile,
    changePassword,
    clearUserState,
    userLogout
  }
})
