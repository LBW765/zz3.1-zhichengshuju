<template>
  <div class="app-wrapper" :class="classObj">
    <Navbar class="top-navbar" />

    <div class="content-wrapper">
      <Sidebar v-if="showSidebar" class="sidebar-container" />
      <div class="main-container" :class="{ 'no-sidebar': !showSidebar }">
        <div v-if="showTagsView" class="fixed-header" :class="{ 'no-sidebar': !showSidebar }">
          <TagsView />
        </div>
        <AppMain v-bind="appMainMode" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/store/app'
import { usePermissionStore } from '@/store/permission'
import Sidebar from './components/Sidebar.vue'
import Navbar from './components/Navbar.vue'
import TagsView from './components/TagsView.vue'
import AppMain from './components/AppMain.vue'

const route = useRoute()
const appStore = useAppStore()
const permissionStore = usePermissionStore()

// 根据当前路由同步 activeTabId（必须放在始终挂载的组件里，不能放 Sidebar）
watch(() => route.path, () => {
  if (appStore.isPlatformSwitching) return
  // 按路径长度降序排序，优先匹配更长的路径（避免 /platform-config 被 /platform 误匹配）
  const sortedTabs = [...permissionStore.topTabs].sort((a, b) => b.path.length - a.path.length)
  const matchedTab = sortedTabs.find(tab => route.path === tab.path || route.path.startsWith(`${tab.path}/`))
  if (matchedTab && String(matchedTab.id) !== appStore.activeTabId) {
    appStore.setActiveTab(matchedTab.id)
  }
}, { immediate: true })

const activeTab = computed(() => {
  return permissionStore.topTabs.find(tab => String(tab.id) === appStore.activeTabId) || permissionStore.topTabs[0]
})

const isPageLayout = computed(() => activeTab.value?.meta?.layout === 'page')

const sidebarRoutes = computed(() => {
  if (!activeTab.value || isPageLayout.value) return []
  return (activeTab.value.children || []).filter(item => !item.meta?.hidden)
})

const showSidebar = computed(() => {
  if (isPageLayout.value) return false
  if (!sidebarRoutes.value.length) return false
  return true
})

const showTagsView = computed(() => showSidebar.value)

const appMainMode = computed(() => ({
  isPageLayout: !showSidebar.value,
  hasTagsView: showTagsView.value
}))

const classObj = computed(() => ({
  mobile: appStore.device === 'mobile'
}))
</script>

<style lang="scss" scoped>
.app-wrapper {
  position: relative;
  height: 100%;
  width: 100%;
  background-color: var(--bg-color);

  // 顶部导航栏
  .top-navbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1002;
  }

  // 内容区域（Navbar 下方）
  .content-wrapper {
    padding-top: var(--header-height);
    height: 100%;
    display: flex;
    min-width: 0;
    overflow: hidden;
  }

  .sidebar-container {
    transition: width var(--transition-duration) var(--transition-function);
    width: var(--sidebar-width) !important;
    height: calc(100vh - var(--header-height));
    position: fixed;
    font-size: 0px;
    top: var(--header-height);
    bottom: 0;
    left: 0;
    z-index: 1001;
    overflow: hidden;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
  }

  .main-container {
    min-height: calc(100vh - var(--header-height));
    min-width: 0;
    overflow: hidden;
    transition: margin-left var(--transition-duration) var(--transition-function);
    margin-left: var(--sidebar-width);
    position: relative;
    background-color: var(--bg-color);
    flex: 1;

    &.no-sidebar {
      margin-left: 0;
    }
  }

  .fixed-header {
    position: fixed;
    top: var(--header-height);
    right: 0;
    z-index: 9;
    width: calc(100% - var(--sidebar-width));
    transition: width var(--transition-duration) var(--transition-function);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);

    &.no-sidebar {
      width: 100%;
    }
  }

  &.mobile {
    .main-container {
      margin-left: 0;
    }

    .sidebar-container {
      transition: transform var(--transition-duration) var(--transition-function);
    }

    &.hideSidebar {
      .sidebar-container {
        transform: translate3d(calc(0px - var(--sidebar-width)), 0, 0);
      }
    }
  }
}
</style>