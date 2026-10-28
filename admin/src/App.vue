<template>
  <el-config-provider :locale="zhCn">
    <router-view />
  </el-config-provider>
</template>

<script setup>
import { onMounted } from 'vue'
import { useThemeStore } from '@/store/theme'
import { useAppStore } from '@/store/app'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

const themeStore = useThemeStore()
const appStore = useAppStore()

onMounted(() => {
  // 初始化主题
  themeStore.initTheme()
  // 初始化平台配置
  appStore.fetchPlatformConfig()
})
</script>

<style>
#app {
  height: 100%;
}
</style>
