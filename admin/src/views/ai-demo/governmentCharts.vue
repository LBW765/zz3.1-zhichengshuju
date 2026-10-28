<template>
  <div class="government-charts">
    <div class="chart-surface"><div class="surface-heading"><div><span class="eyebrow">INDUSTRY OUTPUT</span><h3>AI 产业产值趋势</h3></div><span>近 12 个月 · 亿元</span></div><div ref="lineEl" class="chart-box" role="img" aria-label="AI 产业产值趋势图，点击查看项目台账" /></div>
    <div class="chart-surface"><div class="surface-heading"><div><span class="eyebrow">SCENARIO MIX</span><h3>应用场景分布</h3></div><span>演示数据</span></div><div ref="pieEl" class="chart-box" role="img" aria-label="应用场景分布图，点击查看项目台账" /></div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({ trend: { type: Array, default: () => [] }, distribution: { type: Array, default: () => [] } })
const emit = defineEmits(['navigate'])
const lineEl = ref(null)
const pieEl = ref(null)
let lineChart
let pieChart
let observer
const labels = ['工业领域','智能交通','智能医疗','金融领域','教育领域','智能客服','安防']

function render() {
  if (!lineChart || !pieChart) return
  const css = getComputedStyle(lineEl.value.closest('.ai-demo'))
  const green = css.getPropertyValue('--demo-green').trim()
  const orange = css.getPropertyValue('--demo-orange').trim()
  const blue = css.getPropertyValue('--demo-blue').trim()
  lineChart.setOption({
    animation: false, color: [green], tooltip: { trigger: 'axis', valueFormatter: value => `${value} 亿元` },
    grid: { left: 40, right: 18, top: 24, bottom: 30 },
    xAxis: { type: 'category', boundaryGap: false, data: ['11月','12月','1月','2月','3月','4月','5月','6月','7月','8月','9月','10月'] },
    yAxis: { type: 'value', min: 60, splitLine: { lineStyle: { color: '#edf1f2' } } },
    series: [{ type: 'line', smooth: .35, symbolSize: 7, lineStyle: { width: 3 }, areaStyle: { color: 'rgba(35,140,123,.12)' }, data: props.trend }]
  })
  pieChart.setOption({
    animation: false, color: [green, orange, blue, '#6d9d60', '#b5a35c', '#d16c65', '#8394a4'],
    tooltip: { trigger: 'item', formatter: '{b}: {d}%' },
    legend: { bottom: 0, itemWidth: 9, itemHeight: 9, textStyle: { fontSize: 11 } },
    series: [{ type: 'pie', radius: ['52%', '73%'], center: ['50%', '43%'], label: { show: false }, data: labels.map((name, index) => ({ name, value: props.distribution[index] || 0 })) }]
  })
}

onMounted(() => {
  lineChart = echarts.init(lineEl.value)
  pieChart = echarts.init(pieEl.value)
  lineChart.on('click', () => emit('navigate'))
  pieChart.on('click', () => emit('navigate'))
  observer = new ResizeObserver(() => { lineChart?.resize(); pieChart?.resize() })
  observer.observe(lineEl.value)
  observer.observe(pieEl.value)
  render()
})
watch(() => [props.trend, props.distribution], render)
onBeforeUnmount(() => { observer?.disconnect(); lineChart?.dispose(); pieChart?.dispose() })
</script>
