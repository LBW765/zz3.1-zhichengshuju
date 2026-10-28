<template>
  <view class="app-card" :class="customClass">
    <slot />
  </view>
</template>

<script setup>
defineProps({
  customClass: {
    type: String,
    default: ''
  }
})
</script>
