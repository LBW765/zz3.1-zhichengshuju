<template>
  <view class="app-tab-bar">
    <view
      v-for="item in items"
      :key="item.path"
      class="app-tab-bar__item"
      :class="{ 'is-active': item.path === current }"
      @click="switchTab(item.path)"
    >
      <text class="iconfont app-tab-bar__icon" :class="`icon-${item.icon}`" />
      <text class="app-tab-bar__label">{{ item.label }}</text>
    </view>
  </view>
</template>

<script setup>
defineProps({
  current: {
    type: String,
    default: ''
  },
  items: {
    type: Array,
    default: () => []
  }
})

const switchTab = (path) => {
  uni.switchTab({ url: path })
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.app-tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  background: $bg-card;
  border-top: 1px solid $border-light;
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 100;
}

.app-tab-bar__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 112rpx;
  gap: 6rpx;
  color: $text-secondary;
}

.app-tab-bar__item.is-active {
  color: $primary-color;
}

.app-tab-bar__icon {
  font-size: 44rpx;
  line-height: 1;
}

.app-tab-bar__label {
  font-size: 22rpx;
}
</style>
