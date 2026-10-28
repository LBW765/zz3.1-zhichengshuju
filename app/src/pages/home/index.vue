<template>
  <view class="app-page app-page--tabbar">
    <AppNavbar title="首页" />
    <view class="app-page__body home-page">
      <AppCard customClass="home-hero">
        <view class="home-hero__eyebrow">WORKSPACE</view>
        <view class="home-hero__title">你好，{{ displayName }}</view>
        <view class="home-hero__desc">模板脚手架已保留登录、个人中心、主题设置和基础系统管理能力。</view>
      </AppCard>

      <view class="home-grid">
        <AppCard v-for="item in workbenchItems" :key="item.path" customClass="home-grid__card" @click="go(item.path)">
          <view class="home-grid__label">{{ item.label }}</view>
          <view class="home-grid__value">{{ item.value }}</view>
        </AppCard>
      </view>

      <AppCard customClass="home-section">
        <view class="app-section-title">常用入口</view>
        <view class="home-list">
          <view class="home-list__item" @click="go('/pages/profile/index')">个人资料</view>
          <view class="home-list__item" @click="go('/pages/change-password/index')">修改密码</view>
          <view class="home-list__item" @click="go('/pages/theme/index')">主题设置</view>
          <view class="home-list__item" @click="go('/pages/mine/index')">进入我的</view>
        </view>
      </AppCard>
    </view>
    <AppTabBar current="/pages/home/index" :items="tabItems" />
  </view>
</template>

<script setup>
import { computed } from 'vue'
import AppNavbar from '@/components/app-navbar/index.vue'
import AppCard from '@/components/app-card/index.vue'
import AppTabBar from '@/components/app-tab-bar/index.vue'
import { useUserStore } from '@/store/user'
import { useAuthGuard } from '@/composables/useAuthGuard'

useAuthGuard().checkAuth()

const userStore = useUserStore()
const displayName = computed(() => userStore.userInfo.nickName || userStore.userInfo.userName || '用户')
const workbenchItems = [
  { label: '个人资料', value: '查看', path: '/pages/profile/index' },
  { label: '修改密码', value: '管理', path: '/pages/change-password/index' },
  { label: '主题设置', value: '切换', path: '/pages/theme/index' },
  { label: '我的中心', value: '进入', path: '/pages/mine/index' }
]
const tabItems = [
  { path: '/pages/home/index', icon: 'shouye', label: '首页' },
  { path: '/pages/mine/index', icon: 'wode', label: '我的' }
]
const go = (path) => uni.navigateTo({ url: path })
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.home-page { padding-top: $space-md; }
:deep(.home-hero) { padding: 36rpx 32rpx; background: linear-gradient(135deg, $primary-color, $primary-light); }
.home-hero__eyebrow { font-size: 22rpx; font-weight: 700; color: rgba(255, 255, 255, 0.72); }
.home-hero__title { margin-top: 20rpx; font-size: 44rpx; font-weight: 700; color: #fff; }
.home-hero__desc { margin-top: 16rpx; font-size: 24rpx; line-height: 1.7; color: rgba(255, 255, 255, 0.86); }
.home-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24rpx; margin-top: 24rpx; }
:deep(.home-grid__card), :deep(.home-section) { padding: 28rpx; }
.home-grid__label { font-size: 24rpx; color: $text-secondary; }
.home-grid__value { margin-top: 16rpx; font-size: 30rpx; font-weight: 600; color: $text-primary; }
.home-section { margin-top: 24rpx; }
.home-list { margin-top: 20rpx; }
.home-list__item { position: relative; padding: 18rpx 0 18rpx 28rpx; font-size: 26rpx; color: $text-regular; }
.home-list__item::before { content: ''; position: absolute; top: 30rpx; left: 0; width: 12rpx; height: 12rpx; border-radius: 50%; background: $primary-color; }
</style>
