<template>
  <AppCard customClass="output-card">
    <view class="output-card__title">本月报工</view>
    <view class="output-grid">
      <view v-for="item in metrics" :key="item.label" class="metric">
        <view class="metric__value">{{ item.value }}</view>
        <view class="metric__label">{{ item.label }}</view>
      </view>
    </view>
  </AppCard>
</template>

<script setup>
import { computed } from 'vue'
import AppCard from '@/components/app-card/index.vue'

const props = defineProps({ data: { type: Object, default: () => ({}) } })
const metrics = computed(() => [
  { label: '合格件数', value: props.data.goodQty ?? props.data.good_qty ?? 0 },
  { label: '不良件数', value: props.data.defectQty ?? props.data.defect_qty ?? 0 },
  { label: '报工工时', value: props.data.workHours ?? props.data.work_hours ?? 0 },
  { label: '合格率', value: `${props.data.qualityRate ?? props.data.quality_rate ?? 0}%` },
  { label: '预计工资', value: Number(props.data.estimatedPay ?? props.data.estimated_pay ?? 0).toFixed(2) }
])
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;
:deep(.output-card) { padding: 30rpx; }
.output-card__title { font-size: 32rpx; font-weight: 700; color: $text-primary; }
.output-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18rpx; margin-top: 24rpx; }
.metric { padding: 24rpx; border-radius: $radius-sm; background: $bg-muted; }
.metric__value { font-size: 34rpx; font-weight: 800; color: $text-primary; }
.metric__label { margin-top: 8rpx; font-size: 23rpx; color: $text-secondary; }
</style>
