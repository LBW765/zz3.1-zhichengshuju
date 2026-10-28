import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '@/store/app'

export const useTheme = () => {
  const appStore = useAppStore()
  const { themeMode, primaryColor, isDark } = storeToRefs(appStore)

  const themeClass = computed(() => `theme-${themeMode.value}`)

  return {
    themeMode,
    primaryColor,
    isDark,
    themeClass,
    setThemeMode: appStore.setThemeMode,
    setPrimaryColor: appStore.setPrimaryColor
  }
}
