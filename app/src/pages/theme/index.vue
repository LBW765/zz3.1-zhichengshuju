<template>
  <view class="app-page">
    <AppNavbar title="主题设置" :backable="true" />
    <view class="app-page__body theme-page">

      <!-- 亮/暗模式 -->
      <view class="theme-section-title">外观模式</view>
      <AppCard customClass="theme-mode-card">
        <view
          class="theme-mode-item"
          :class="{ 'is-active': pendingMode === 'light' }"
          @click="pendingMode = 'light'"
        >
          <view class="theme-mode-preview theme-mode-preview--light">
            <view class="preview-bar" />
            <view class="preview-content" />
          </view>
          <text class="theme-mode-label">浅色</text>
          <view v-if="pendingMode === 'light'" class="theme-mode-check">✓</view>
        </view>
        <view
          class="theme-mode-item"
          :class="{ 'is-active': pendingMode === 'dark' }"
          @click="pendingMode = 'dark'"
        >
          <view class="theme-mode-preview theme-mode-preview--dark">
            <view class="preview-bar" />
            <view class="preview-content" />
          </view>
          <text class="theme-mode-label">深色</text>
          <view v-if="pendingMode === 'dark'" class="theme-mode-check">✓</view>
        </view>
      </AppCard>

      <!-- 主题色 -->
      <view class="theme-section-title" style="margin-top: 40rpx;">主题色</view>
      <AppCard customClass="theme-color-card">
        <view class="theme-color-grid">
          <view
            v-for="color in colorOptions"
            :key="color.value"
            class="theme-color-item"
            :style="{ background: color.value }"
            @click="pendingColor = color.value"
          >
            <view v-if="pendingColor === color.value" class="theme-color-check">✓</view>
          </view>
        </view>
      </AppCard>

      <!-- 保存按钮 -->
      <view class="app-primary-btn theme-save-btn" @click="handleSave">保存</view>

    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import AppNavbar from '@/components/app-navbar/index.vue'
import AppCard from '@/components/app-card/index.vue'
import { useAuthGuard } from '@/composables/useAuthGuard'
import { useTheme } from '@/composables/useTheme'

const { checkAuth } = useAuthGuard()
checkAuth()

const { isDark, primaryColor, setThemeMode, setPrimaryColor } = useTheme()

// 本地暂存，点保存才写入
const pendingMode = ref(isDark.value ? 'dark' : 'light')
const pendingColor = ref(primaryColor.value)

const colorOptions = [
  { value: '#409eff' },
  { value: '#67c23a' },
  { value: '#e6a23c' },
  { value: '#f56c6c' },
  { value: '#9b59b6' },
  { value: '#1abc9c' },
  { value: '#e74c3c' },
  { value: '#2c3e50' },
]

const handleSave = () => {
  setThemeMode(pendingMode.value)
  setPrimaryColor(pendingColor.value)
  uni.showToast({ title: '已保存', icon: 'success' })
  setTimeout(() => {
    uni.switchTab({ url: '/pages/mine/index' })
  }, 800)
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.theme-page {
  padding-top: $space-lg;
}

.theme-section-title {
  margin-bottom: 16rpx;
  padding: 0 4rpx;
  font-size: 24rpx;
  color: $text-secondary;
}

:deep(.theme-mode-card) {
  display: flex;
  flex-direction: row;
  padding: 28rpx;
  gap: 24rpx;
}

.theme-mode-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 16rpx;
  border-radius: $radius-base;
  border: 2rpx solid $border-light;
  position: relative;
  transition: border-color 0.2s;

  &.is-active {
    border-color: $primary-color;
  }
}

.theme-mode-preview {
  width: 100%;
  height: 100rpx;
  border-radius: 12rpx;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  padding: 10rpx;
}

.theme-mode-preview--light {
  background: #f5f7fa;
}

.theme-mode-preview--light .preview-bar {
  height: 16rpx;
  border-radius: 8rpx;
  background: #e4e7ed;
}

.theme-mode-preview--light .preview-content {
  flex: 1;
  border-radius: 8rpx;
  background: #ffffff;
}

.theme-mode-preview--dark {
  background: #1a1a2e;
}

.theme-mode-preview--dark .preview-bar {
  height: 16rpx;
  border-radius: 8rpx;
  background: #2a2a4a;
}

.theme-mode-preview--dark .preview-content {
  flex: 1;
  border-radius: 8rpx;
  background: #16213e;
}

.theme-mode-label {
  font-size: 26rpx;
  color: $text-primary;
}

.theme-mode-check {
  position: absolute;
  top: 12rpx;
  right: 16rpx;
  font-size: 24rpx;
  color: $primary-color;
  font-weight: 700;
}

:deep(.theme-color-card) {
  padding: 32rpx;
}

.theme-color-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24rpx;
}

.theme-color-item {
  height: 120rpx;
  border-radius: $radius-base;
  display: flex;
  align-items: center;
  justify-content: center;
}

.theme-color-check {
  font-size: 32rpx;
  color: #fff;
  font-weight: 700;
}

.theme-save-btn {
  margin-top: 60rpx;
}
</style>
