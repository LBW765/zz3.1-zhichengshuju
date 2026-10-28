<template>
  <div class="sidebar-container">
    <!-- 菜单区域 -->
    <el-scrollbar class="menu-scrollbar">
      <el-menu
        :default-active="activeMenu"
        :collapse="false"
        :background-color="'transparent'"
        :text-color="'var(--text-primary)'"
        :active-text-color="'var(--primary-color)'"
        :unique-opened="false"
        :collapse-transition="false"
        mode="vertical"
        class="sidebar-menu"
      >
        <SidebarItem
          v-for="route in routes"
          :key="route.path"
          :item="route"
          :base-path="currentTab?.path || ''"
        />
      </el-menu>
    </el-scrollbar>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/store/app'
import { usePermissionStore } from '@/store/permission'
import SidebarItem from './SidebarItem.vue'

const route = useRoute()
const appStore = useAppStore()
const permissionStore = usePermissionStore()

const activeMenu = computed(() => route.path)
const currentTab = computed(() => {
  return permissionStore.topTabs.find(tab => String(tab.id) === appStore.activeTabId) || permissionStore.topTabs[0]
})

const routes = computed(() => {
  if (!currentTab.value || currentTab.value.meta?.layout === 'page') {
    return []
  }

  const children = (currentTab.value.children || []).filter(item => !item.meta?.hidden)

  return children
})
</script>

<style lang="scss" scoped>
.sidebar-container {
  width: var(--sidebar-width);
  height: calc(100vh - var(--header-height));
  position: fixed;
  top: var(--header-height);
  bottom: 0;
  left: 0;
  z-index: 1001;
  overflow: hidden;
  background-color: var(--bg-sidebar);
  border-right: 1px solid var(--border-color);
  transition: width 0.28s ease;
  display: flex;
  flex-direction: column;
}

// 菜单滚动区域
.menu-scrollbar {
  flex: 1;
  overflow: hidden;

  :deep(.el-scrollbar__view) {
    height: 100%;
  }
}

// 菜单样式
.sidebar-menu {
  border: none;
  padding: 8px;

  :deep(.el-menu-item),
  :deep(.el-sub-menu__title) {
    height: 44px;
    line-height: 44px;
    margin: 4px 0;
    border-radius: 8px;
    font-size: 14px;
    transition: all 0.2s;

    &:hover {
      background-color: var(--bg-hover) !important;
    }

    .el-icon {
      font-size: 18px;
      margin-right: 10px;
    }
  }

  :deep(.el-menu-item.is-active) {
    background: linear-gradient(135deg, rgba(var(--primary-color-rgb), 0.15), rgba(var(--primary-color-rgb), 0.05)) !important;
    color: var(--primary-color);
    font-weight: 500;

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 20px;
      background: var(--primary-color);
      border-radius: 0 3px 3px 0;
    }
  }

  :deep(.el-sub-menu.is-active > .el-sub-menu__title) {
    color: var(--primary-color);
  }
}

// 过渡动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
