<template>
  <view class="app-empty">
    <view class="app-empty__icon">{{ icon }}</view>
    <text class="app-empty__title">{{ title }}</text>
    <text v-if="description" class="app-empty__description">{{ description }}</text>
  </view>
</template>

<script setup>
defineProps({
  icon: {
    type: String,
    default: '○'
  },
  title: {
    type: String,
    default: '暂无内容'
  },
  description: {
    type: String,
    default: ''
  }
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.app-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 32rpx;
  text-align: center;
}

.app-empty__icon {
  margin-bottom: 24rpx;
  font-size: 72rpx;
  color: $text-light;
}

.app-empty__title {
  font-size: 30rpx;
  font-weight: 600;
  color: $text-primary;
}

.app-empty__description {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: $text-secondary;
}
</style>
