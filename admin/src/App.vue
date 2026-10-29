<template>
  <el-config-provider :locale="zhCn">
    <router-view />
  </el-config-provider>
</template>

<script setup>
import { onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useThemeStore } from '@/store/theme'
import { useAppStore } from '@/store/app'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

const themeStore = useThemeStore()
const appStore = useAppStore()
const router = useRouter()

const syncPageScroll = (path) => {
  document.body.classList.toggle('ai-demo-mode', path.startsWith('/ai-demo'))
}

watch(() => router.currentRoute.value.path, syncPageScroll, { immediate: true })

onMounted(async () => {
  // 初始化主题
  themeStore.initTheme()
  // 初始化平台配置
  await router.isReady()
  if (!router.currentRoute.value.path.startsWith('/ai-demo')) appStore.fetchPlatformConfig()
})
</script>

<style>
#app {
  height: 100%;
}

body.ai-demo-mode {
  overflow: auto;
}

</style>
