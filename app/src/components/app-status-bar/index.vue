<template>
  <view class="app-status-bar" :style="barStyle"></view>
</template>

<script setup>
import { computed } from 'vue'
import { getStatusBarHeight } from '@/utils/platform'

const props = defineProps({
  background: {
    type: String,
    default: 'transparent'
  }
})

const barStyle = computed(() => ({
  height: `${getStatusBarHeight()}px`,
  background: props.background
}))
</script>

<style lang="scss" scoped>
.app-status-bar {
  width: 100%;
  flex-shrink: 0;
}
</style>
