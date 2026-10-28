import { STORAGE_KEYS } from '@/constants/storage'

export const getToken = () => uni.getStorageSync(STORAGE_KEYS.TOKEN) || ''

export const setToken = (token) => uni.setStorageSync(STORAGE_KEYS.TOKEN, token)

export const removeToken = () => uni.removeStorageSync(STORAGE_KEYS.TOKEN)
