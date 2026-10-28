import { defineStore } from 'pinia'
import { ref } from 'vue'
import request from '@/utils/request'
import { PLATFORMS } from '@/constants/auth'
import { generatePrimaryColors } from '@/utils/color'

export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(false)
  const device = ref('desktop')
  const activeTabId = ref(localStorage.getItem('active-tab-id') || '')
  const currentPlatform = ref(localStorage.getItem('current-platform') || PLATFORMS.APP)
  const isPlatformSwitching = ref(false)

  const platformConfig = ref({
    fullName: '后台管理系统',
    shortName: '管理系统',
    navLabel: '控制台',
    logo: '',
    loginSubtitle: '统一配置与业务协同平台',
    companyName: '',
    copyrightYear: '2026',
    icp: '',
    primaryColor: '#409EFF'
  })

  const setPlatform = (platform) => {
    currentPlatform.value = platform
    localStorage.setItem('current-platform', platform)
  }

  const setActiveTab = (tabId) => {
    const value = tabId == null ? '' : String(tabId)
    activeTabId.value = value
    localStorage.setItem('active-tab-id', value)
  }

  const setPlatformSwitching = (value) => {
    isPlatformSwitching.value = value
  }

  const initActiveTab = () => {
    activeTabId.value = localStorage.getItem('active-tab-id') || ''
  }

  // 桌面端固定展开，不提供折叠功能
  const toggleSidebar = () => {}

  // 移动端仍可关闭侧边栏
  const closeSidebar = () => {
    sidebarCollapsed.value = true
  }

  const openSidebar = () => {
    sidebarCollapsed.value = false
  }

  const setDevice = (value) => {
    device.value = value
  }

  const initSidebar = () => {
    sidebarCollapsed.value = false
  }

  const updateFavicon = (logoUrl) => {
    if (!logoUrl) return
    let link = document.querySelector("link[rel*='icon']")
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = logoUrl
  }

  const applyPrimaryColor = (hex, isDark = false) => {
    if (!hex) return
    const vars = generatePrimaryColors(hex, isDark)
    const el = document.documentElement
    Object.entries(vars).forEach(([key, value]) => {
      el.style.setProperty(key, value)
    })
  }

  const updatePlatformConfig = (config) => {
    platformConfig.value = { ...platformConfig.value, ...config }
    document.title = platformConfig.value.fullName || '后台管理系统'
    updateFavicon(platformConfig.value.logo)
    if (platformConfig.value.primaryColor) {
      const isDark = document.documentElement.classList.contains('dark')
      applyPrimaryColor(platformConfig.value.primaryColor, isDark)
    }
  }

  const refreshPrimaryColors = (isDark) => {
    if (platformConfig.value.primaryColor) {
      applyPrimaryColor(platformConfig.value.primaryColor, isDark)
    }
  }

  const fetchPlatformConfig = async () => {
    try {
      const res = await request({
        method: 'get',
        url: '/system/platform/config'
      })
      updatePlatformConfig(res.data)
    } catch (error) {
      console.error('获取平台配置失败:', error)
    }
  }

  return {
    sidebarCollapsed,
    device,
    activeTabId,
    currentPlatform,
    isPlatformSwitching,
    platformConfig,
    setPlatform,
    setActiveTab,
    setPlatformSwitching,
    initActiveTab,
    toggleSidebar,
    closeSidebar,
    openSidebar,
    setDevice,
    initSidebar,
    fetchPlatformConfig,
    updatePlatformConfig,
    refreshPrimaryColors
  }
})
