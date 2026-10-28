import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAppStore } from '@/store/app'

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(false)

  // 初始化主题
  const initTheme = () => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      isDark.value = savedTheme === 'dark'
    } else {
      // 默认使用系统主题偏好
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    applyTheme()
  }

  // 应用主题
  const applyTheme = () => {
    const el = document.documentElement
    if (isDark.value) {
      el.setAttribute('data-theme', 'dark')
      el.classList.add('dark')
    } else {
      el.removeAttribute('data-theme')
      el.classList.remove('dark')
    }
    localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
  }

  // 切换主题
  const toggleTheme = () => {
    isDark.value = !isDark.value
    applyTheme()
    // 根据新主题重新计算主色调衍生变量
    const appStore = useAppStore()
    appStore.refreshPrimaryColors(isDark.value)
  }

  return {
    isDark,
    initTheme,
    toggleTheme
  }
})
