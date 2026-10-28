<template>
  <AppCard customClass="punch-card">
    <view class="punch-card__head">
      <view>
        <view class="punch-card__title">今日打卡</view>
        <view class="punch-card__sub">{{ todayText }}</view>
      </view>
      <view class="punch-card__status">{{ statusText }}</view>
    </view>
    <view class="punch-card__times">
      <view class="punch-card__time">
        <text class="punch-card__label">上班</text>
        <text class="punch-card__value">{{ onTime || '--:--' }}</text>
      </view>
      <view class="punch-card__time">
        <text class="punch-card__label">下班</text>
        <text class="punch-card__value">{{ offTime || '--:--' }}</text>
      </view>
    </view>
    <view class="punch-card__actions">
      <button class="punch-card__btn" :disabled="loading" @click="$emit('punch', 'on')">上班打卡</button>
      <button class="punch-card__btn punch-card__btn--off" :disabled="loading" @click="$emit('punch', 'off')">下班打卡</button>
    </view>
  </AppCard>
</template>

<script setup>
import { computed } from 'vue'
import AppCard from '@/components/app-card/index.vue'

const props = defineProps({
  punches: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
})

defineEmits(['punch'])

const todayText = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

const findTime = (type) => props.punches.find((item) => item.punchType === type || item.punch_type === type)?.punchTime || props.punches.find((item) => item.type === type)?.time
const formatTime = (value) => value ? String(value).slice(11, 16) : ''

const onTime = computed(() => formatTime(findTime('on')))
const offTime = computed(() => formatTime(findTime('off')))
const statusText = computed(() => onTime.value && offTime.value ? '已完成' : onTime.value ? '待下班' : '待打卡')
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

:deep(.punch-card) {
  padding: 32rpx;
}

.punch-card__head,
.punch-card__times,
.punch-card__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.punch-card__title {
  font-size: 34rpx;
  font-weight: 700;
  color: $text-primary;
}

.punch-card__sub {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: $text-secondary;
}

.punch-card__status {
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(var(--primary-color-rgb), 0.1);
  color: $primary-color;
  font-size: 24rpx;
}

.punch-card__times {
  margin-top: 28rpx;
  gap: 20rpx;
}

.punch-card__time {
  flex: 1;
  padding: 22rpx;
  border-radius: $radius-sm;
  background: $bg-muted;
}

.punch-card__label {
  display: block;
  font-size: 24rpx;
  color: $text-secondary;
}

.punch-card__value {
  display: block;
  margin-top: 12rpx;
  font-size: 36rpx;
  font-weight: 700;
  color: $text-primary;
}

.punch-card__actions {
  gap: 20rpx;
  margin-top: 28rpx;
}

.punch-card__btn {
  flex: 1;
  height: 76rpx;
  line-height: 76rpx;
  border-radius: $radius-sm;
  background: $primary-color;
  color: #fff;
  font-size: 28rpx;
}

.punch-card__btn--off {
  background: $success-color;
}
</style>
