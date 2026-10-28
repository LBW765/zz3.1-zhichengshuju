import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { STORAGE_KEYS } from '@/constants/storage'
import { applyTheme } from '@/utils/theme'

const DEFAULT_PLATFORM_CONFIG = {
  fullName: '模板 App',
  shortName: '模板',
  loginSubtitle: '统一风格的移动端基础脚手架',
  primaryColor: '#409EFF'
}

export const useAppStore = defineStore('app', () => {
  const themeMode = ref(uni.getStorageSync(STORAGE_KEYS.THEME_MODE) || 'light')
  const primaryColor = ref(uni.getStorageSync(STORAGE_KEYS.PRIMARY_COLOR) || DEFAULT_PLATFORM_CONFIG.primaryColor)
  const platformConfig = ref({ ...DEFAULT_PLATFORM_CONFIG })

  const isDark = computed(() => themeMode.value === 'dark')

  const setThemeMode = (mode) => {
    themeMode.value = mode
    uni.setStorageSync(STORAGE_KEYS.THEME_MODE, mode)
    applyTheme(primaryColor.value, mode === 'dark')
  }

  const setPrimaryColor = (color) => {
    primaryColor.value = color
    uni.setStorageSync(STORAGE_KEYS.PRIMARY_COLOR, color)
    platformConfig.value = { ...platformConfig.value, primaryColor: color }
    applyTheme(color, isDark.value)
  }

  const setPlatformConfig = (config = {}) => {
    platformConfig.value = {
      ...platformConfig.value,
      ...config
    }
  }

  return {
    themeMode,
    primaryColor,
    platformConfig,
    isDark,
    setThemeMode,
    setPrimaryColor,
    setPlatformConfig
  }
})
