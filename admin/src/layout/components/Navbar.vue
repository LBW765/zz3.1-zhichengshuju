<template>
  <div class="navbar">
    <!-- 左侧 Logo 区域 -->
    <div class="header-left">
      <div class="logo-link" @click="handleLogoClick">
        <div class="logo-icon">
          <img v-if="platformConfig.logo" :src="platformConfig.logo" alt="Logo" />
          <el-icon v-else :size="24"><Platform /></el-icon>
        </div>
        <span class="logo-title">{{ platformConfig.shortName || '后台管理系统' }}</span>
      </div>
    </div>

    <!-- 中间平台 Tab 区域 -->
    <div class="center-tabs">
      <div
        v-for="tab in topTabs"
        :key="tab.path"
        class="tab-item"
        :class="{ active: activeTopTab === String(tab.id) }"
        @click="handleTopTabClick(tab)"
      >
        <el-icon v-if="tab.meta?.icon" class="tab-icon">
          <component :is="tab.meta.icon" />
        </el-icon>
        <span class="tab-label">{{ tab.meta?.title }}</span>
      </div>
    </div>

    <div class="right-menu">
      <!-- 搜索按钮 -->
      <el-tooltip content="搜索" placement="bottom">
        <div class="action-btn" @click="handleSearch">
          <el-icon><Search /></el-icon>
        </div>
      </el-tooltip>

      <!-- 主题切换 -->
      <el-tooltip :content="isDark ? '切换浅色模式' : '切换深色模式'" placement="bottom">
        <div class="action-btn" @click="toggleTheme">
          <el-icon><component :is="isDark ? 'Sunny' : 'Moon'" /></el-icon>
        </div>
      </el-tooltip>

      <!-- 平台切换 - 仅超级管理员可见 -->
      <el-tooltip v-if="canAccessAdmin" :content="isAdminPlatform ? '切换到应用平台' : '切换到管理平台'" placement="bottom">
        <div class="action-btn" @click="togglePlatform">
          <el-icon><component :is="isAdminPlatform ? 'Setting' : 'Monitor'" /></el-icon>
        </div>
      </el-tooltip>

      <!-- 全屏 -->
      <el-tooltip content="全屏" placement="bottom">
        <div class="action-btn" @click="toggleFullScreen">
          <el-icon><FullScreen /></el-icon>
        </div>
      </el-tooltip>

      <!-- 用户下拉菜单 -->
      <el-dropdown class="avatar-dropdown" trigger="click" @command="handleCommand">
        <div class="avatar-wrapper">
          <el-avatar
            :size="36"
            :src="userInfo.avatar || defaultAvatar"
          />
          <span class="user-name">{{ userInfo.nickName || '管理员' }}</span>
          <el-icon class="arrow"><CaretBottom /></el-icon>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile">
              <el-icon><User /></el-icon>
              <span>个人中心</span>
            </el-dropdown-item>
            <el-dropdown-item command="settings">
              <el-icon><Setting /></el-icon>
              <span>系统设置</span>
            </el-dropdown-item>
            <el-dropdown-item divided command="logout">
              <el-icon><SwitchButton /></el-icon>
              <span>退出登录</span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <!-- 搜索面板 -->
    <SearchPanel v-model:visible="searchVisible" />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useAppStore } from '@/store/app'
import { useUserStore } from '@/store/user'
import { useThemeStore } from '@/store/theme'
import { usePermissionStore } from '@/store/permission'
import { useTagsViewStore } from '@/store/tagsView'
import { PLATFORMS } from '@/constants/auth'
import { getTabHome } from '@/utils/navigation'
import SearchPanel from '@/components/SearchPanel/index.vue'
import {
  Search, Sunny, Moon, FullScreen, User, Setting, SwitchButton, CaretBottom,
  Monitor, Platform
} from '@element-plus/icons-vue'

const router = useRouter()
const appStore = useAppStore()
const userStore = useUserStore()
const themeStore = useThemeStore()
const permissionStore = usePermissionStore()
const tagsViewStore = useTagsViewStore()

const defaultAvatar = 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png'
const searchVisible = ref(false)

const userInfo = computed(() => userStore.userInfo)
const isDark = computed(() => themeStore.isDark)

// 平台切换相关
const currentPlatform = computed(() => appStore.currentPlatform)
const canAccessAdmin = computed(() => userStore.canAccessAdmin)
const isAdminPlatform = computed(() => currentPlatform.value === PLATFORMS.ADMIN)
const platformConfig = computed(() => appStore.platformConfig)
const topTabs = computed(() => permissionStore.topTabs)
const activeTopTab = computed(() => String(appStore.activeTabId || ''))

const handleTopTabClick = (tab) => {
  appStore.setActiveTab(tab.id)
  router.push(getTabHome(tab))
}

const handleLogoClick = () => {
  // 点击 LOGO 跳转到第一个菜单的首页
  if (topTabs.value.length > 0) {
    const firstTab = topTabs.value[0]
    appStore.setActiveTab(firstTab.id)
    router.push(getTabHome(firstTab))
  } else {
    // 如果没有菜单，跳转到个人中心
    router.push('/profile')
  }
}

const togglePlatform = async () => {
  const targetPlatform = isAdminPlatform.value ? PLATFORMS.APP : PLATFORMS.ADMIN
  const success = userStore.switchPlatform(targetPlatform)
  if (!success) return

  appStore.setPlatformSwitching(true)
  permissionStore.resetRoutes()
  tagsViewStore.reset()
  appStore.setActiveTab('')
  ElMessage.success({ message: `已切换到${targetPlatform === PLATFORMS.ADMIN ? '管理平台' : '应用平台'}`, offset: 60 })
  await router.replace('/')
}

watch(topTabs, (tabs) => {
  if (!tabs.length) return
  const activeExists = tabs.some(tab => String(tab.id) === activeTopTab.value)
  if (!activeExists && activeTopTab.value) {
    // 只有当 activeTabId 有值但不在列表中时才重置（避免与路由守卫的自动识别冲突）
    appStore.setActiveTab(tabs[0].id)
  }
}, { immediate: true })

const toggleTheme = () => {
  themeStore.toggleTheme()
}

const toggleFullScreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
  } else {
    document.exitFullscreen()
  }
}

const handleSearch = () => {
  searchVisible.value = true
}

// 预留：后续拓展信息中心时启用搜索和通知功能

const handleCommand = (command) => {
  switch (command) {
    case 'profile':
      router.push('/profile')
      break
    case 'settings':
      if (canAccessAdmin.value) {
        userStore.switchPlatform(PLATFORMS.ADMIN)
        appStore.setPlatformSwitching(true)
        permissionStore.resetRoutes()
        tagsViewStore.reset()
        appStore.setActiveTab('')
        router.replace('/')
      } else {
        ElMessage.info('当前账号暂无系统设置权限')
      }
      break
    case 'logout':
      ElMessageBox.confirm('确定要退出登录吗?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        userStore.userLogout().then(() => {
          router.push('/login')
        })
      })
      break
  }
}
</script>

<style lang="scss" scoped>
.navbar {
  height: var(--header-height);
  background: var(--bg-header);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-sizing: border-box;

  // 左侧 Logo 区域
  .header-left {
    flex-shrink: 0;
    margin-right: 32px;
    display: flex;
    align-items: center;

    .logo-link {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
    }

    .logo-icon {
      width: 36px;
      height: 36px;
      min-width: 36px;
      background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      box-shadow: 0 2px 8px rgba(var(--primary-color-rgb), 0.3);

      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        border-radius: 10px;
      }
    }

    .logo-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-primary);
      white-space: nowrap;
      letter-spacing: -0.3px;
    }
  }

  // 中间平台 Tab 区域
  .center-tabs {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-width: 0;

    .tab-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0 20px;
      height: 36px;
      cursor: pointer;
      white-space: nowrap;
      color: var(--text-secondary);
      font-size: 14px;
      font-weight: 500;
      border-radius: 10px;
      transition: all 0.25s ease;

      &:hover {
        color: var(--text-primary);
        background: var(--bg-hover);
      }

      &.active {
        color: var(--primary-color);
        font-weight: 600;
      }

      .tab-icon {
        font-size: 16px;
      }

      .tab-label {
        font-size: 14px;
      }
    }
  }

  .right-menu {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 8px;

    // 统一的操作按钮样式
    .action-btn {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      color: var(--text-secondary);
      position: relative;

      &:hover {
        background: var(--bg-hover);
        color: var(--primary-color);
      }

      // 激活状态（用于平台切换按钮）
      &.active {
        color: var(--primary-color);
        background: var(--bg-hover);
      }

      .el-icon {
        font-size: 18px;
      }
    }

    // 用户头像下拉
    .avatar-dropdown {
      margin-left: 4px;

      .avatar-wrapper {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 10px 4px 4px;
        border-radius: 20px;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          background: var(--bg-hover);
        }

        .el-avatar {
          border: 2px solid var(--border-color);
        }

        .user-name {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
          max-width: 80px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .arrow {
          font-size: 12px;
          color: var(--text-secondary);
        }
      }
    }
  }
}

// 下拉菜单样式
:deep(.el-dropdown-menu) {
  padding: 8px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);

  .el-dropdown-menu__item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 14px;
    color: var(--text-primary);
    transition: all 0.2s;

    &:hover {
      background: var(--bg-hover);
      color: var(--primary-color);
    }

    .el-icon {
      font-size: 16px;
    }
  }

  .el-dropdown-menu__item--divided {
    margin-top: 8px;
    border-top: 1px solid var(--border-color);
    padding-top: 16px;

    &::before {
      display: none;
    }
  }
}

</style>
