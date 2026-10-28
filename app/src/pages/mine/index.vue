<template>
  <view class="app-page app-page--tabbar">
    <AppNavbar title="我的" />
    <view class="app-page__body mine-page">
      <AppCard customClass="mine-user-card" @click="goProfile">
        <view class="mine-user-card__inner">
          <view class="mine-avatar">{{ avatarLetter }}</view>
          <view class="mine-user-info">
            <view class="mine-user-card__name">{{ displayName }}</view>
            <view class="mine-user-card__meta">{{ userStore.userInfo.email || '未设置邮箱' }}</view>
          </view>
          <text class="mine-user-card__arrow">›</text>
        </view>
      </AppCard>

      <AppCard customClass="mine-grid-card">
        <view class="mine-grid">
          <view v-for="item in gridItems" :key="item.key" class="mine-grid__item" @click="item.action">
            <view class="mine-grid__icon" :class="item.colorClass">{{ item.short }}</view>
            <text class="mine-grid__label">{{ item.label }}</text>
          </view>
        </view>
      </AppCard>

      <AppCard customClass="mine-setting-card">
        <view class="mine-setting-item" @click="goProfile">
          <text class="mine-setting-item__label">个人资料</text>
          <view class="mine-setting-item__right"><text class="mine-setting-item__arrow">›</text></view>
        </view>
        <view class="mine-setting-item" @click="goTheme">
          <text class="mine-setting-item__label">主题设置</text>
          <view class="mine-setting-item__right">
            <text class="mine-setting-item__value">{{ isDark ? '深色' : '浅色' }}</text>
            <text class="mine-setting-item__arrow">›</text>
          </view>
        </view>
        <view class="mine-setting-item" @click="goPassword">
          <text class="mine-setting-item__label">修改密码</text>
          <view class="mine-setting-item__right"><text class="mine-setting-item__arrow">›</text></view>
        </view>
        <view class="mine-setting-item mine-setting-item--danger" @click="handleLogout">
          <text class="mine-setting-item__label">退出登录</text>
          <view class="mine-setting-item__right"><text class="mine-setting-item__arrow">›</text></view>
        </view>
      </AppCard>
    </view>
    <AppTabBar current="/pages/mine/index" :items="tabItems" />
  </view>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import AppNavbar from '@/components/app-navbar/index.vue'
import AppCard from '@/components/app-card/index.vue'
import AppTabBar from '@/components/app-tab-bar/index.vue'
import { useUserStore } from '@/store/user'
import { useAuthGuard } from '@/composables/useAuthGuard'
import { useTheme } from '@/composables/useTheme'

useAuthGuard().checkAuth()

const userStore = useUserStore()
const { isDark } = useTheme()
const displayName = computed(() => userStore.userInfo.nickName || userStore.userInfo.userName || '用户')
const avatarLetter = computed(() => displayName.value.charAt(0).toUpperCase() || '?')
const gridItems = [
  { key: 'profile', short: '资', colorClass: 'grid-icon--primary', label: '个人资料', action: () => uni.navigateTo({ url: '/pages/profile/index' }) },
  { key: 'password', short: '密', colorClass: 'grid-icon--warning', label: '修改密码', action: () => uni.navigateTo({ url: '/pages/change-password/index' }) },
  { key: 'theme', short: '色', colorClass: 'grid-icon--success', label: '主题设置', action: () => uni.navigateTo({ url: '/pages/theme/index' }) },
  { key: 'home', short: '首', colorClass: 'grid-icon--neutral', label: '返回首页', action: () => uni.switchTab({ url: '/pages/home/index' }) }
]
const tabItems = [
  { path: '/pages/home/index', icon: 'shouye', label: '首页' },
  { path: '/pages/mine/index', icon: 'wode', label: '我的' }
]
const goProfile = () => uni.navigateTo({ url: '/pages/profile/index' })
const goTheme = () => uni.navigateTo({ url: '/pages/theme/index' })
const goPassword = () => uni.navigateTo({ url: '/pages/change-password/index' })
const handleLogout = async () => {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出当前账号吗？',
    confirmText: '退出',
    confirmColor: '#F56C6C',
    success: async (res) => {
      if (!res.confirm) return
      await userStore.userLogout()
      uni.reLaunch({ url: '/pages/login/index' })
    }
  })
}

onMounted(() => {
  if (userStore.hasLogin) userStore.fetchUserInfo().catch(() => {})
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.mine-page { padding-top: $space-md; }
:deep(.mine-user-card) { padding: 28rpx 32rpx; background: linear-gradient(135deg, rgba(var(--primary-color-rgb), 0.12), rgba(var(--primary-color-rgb), 0.04)); }
.mine-user-card__inner { display: flex; align-items: center; gap: 24rpx; }
.mine-avatar { width: 100rpx; height: 100rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, $primary-color, $primary-light); color: #fff; font-size: 40rpx; font-weight: 700; }
.mine-user-info { flex: 1; min-width: 0; }
.mine-user-card__name { font-size: 34rpx; font-weight: 700; color: $text-primary; }
.mine-user-card__meta { margin-top: 8rpx; font-size: 22rpx; color: $text-secondary; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mine-user-card__arrow { font-size: 40rpx; color: $text-light; }
:deep(.mine-grid-card) { margin-top: 24rpx; padding: 32rpx 24rpx; }
.mine-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16rpx; }
.mine-grid__item { display: flex; flex-direction: column; align-items: center; gap: 12rpx; }
.mine-grid__icon { width: 88rpx; height: 88rpx; border-radius: $radius-base; display: flex; align-items: center; justify-content: center; font-size: 32rpx; font-weight: 700; }
.grid-icon--primary { background: rgba(var(--primary-color-rgb), 0.12); color: $primary-color; }
.grid-icon--warning { background: rgba(230, 162, 60, 0.12); color: $warning-color; }
.grid-icon--success { background: rgba(103, 194, 58, 0.12); color: $success-color; }
.grid-icon--neutral { background: var(--bg-muted); color: $text-secondary; }
.mine-grid__label { font-size: 22rpx; color: $text-regular; }
:deep(.mine-setting-card) { margin-top: 24rpx; padding: 0 28rpx; }
.mine-setting-item { display: flex; align-items: center; justify-content: space-between; height: 96rpx; border-bottom: 1px solid $border-light; font-size: 28rpx; color: $text-primary; }
.mine-setting-item:last-child { border-bottom: none; }
.mine-setting-item--danger .mine-setting-item__label { color: $danger-color; }
.mine-setting-item__right { display: flex; align-items: center; gap: 8rpx; }
.mine-setting-item__value { font-size: 26rpx; color: $text-secondary; }
.mine-setting-item__arrow { font-size: 36rpx; color: $text-light; }
</style>
