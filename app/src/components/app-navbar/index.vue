<template>
  <view class="app-navbar">
    <AppStatusBar :background="background" />
    <view class="app-navbar__body" :style="background ? { background } : {}">
      <view class="app-navbar__left" @click="handleBack">
        <text v-if="backable" class="app-navbar__back">‹</text>
      </view>
      <view class="app-navbar__title">{{ title }}</view>
      <view class="app-navbar__right">
        <slot name="right" />
      </view>
    </view>
  </view>
</template>

<script setup>
import AppStatusBar from '@/components/app-status-bar/index.vue'

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  background: {
    type: String,
    default: ''
  },
  backable: {
    type: Boolean,
    default: false
  }
})

const handleBack = () => {
  if (!props.backable) return
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.app-navbar__body {
  display: flex;
  align-items: center;
  height: 88rpx;
  padding: 0 $space-lg;
  background: $bg-color;
}

.app-navbar__left,
.app-navbar__right {
  width: 88rpx;
  display: flex;
  align-items: center;
}

.app-navbar__right {
  justify-content: flex-end;
}

.app-navbar__title {
  flex: 1;
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  color: $text-primary;
}

.app-navbar__back {
  font-size: 44rpx;
  line-height: 1;
  color: $text-primary;
}
</style>
