/**
 * Excel 风格的"填充手柄"
 *
 * 用法:
 *   const fill = useTableFillHandle({
 *     getRows: () => bomItems.value,
 *     onApply: (field, ids, value) => { ...批量更新该字段为 value... }
 *   })
 *
 *   // 在表格单元格里:
 *   <div class="fill-cell"
 *        :class="{ 'is-fill-range': fill.isInRange('quantity', $index) }"
 *        @mouseenter="fill.handleEnter('quantity', $index)">
 *     <el-input-number v-model="row.quantity" />
 *     <span class="fill-handle"
 *           @mousedown.prevent="fill.startDrag('quantity', $index)"></span>
 *   </div>
 *
 * 支持字段:任意,实际由 onApply 解释。常用 'quantity' / 'lossRate'
 *
 * 行为:
 *   - 鼠标按住手柄 → 在同列 mouseenter 其他行,这些行高亮为目标范围
 *   - 松开鼠标 → 调用 onApply(field, [...rangeIds], sourceRowValue)
 *   - 拖动跨行 = 把起始行的当前值,复制到沿途所有行
 */
import { ref } from 'vue'

export function useTableFillHandle({ getRows, onApply }) {
  const dragging = ref(false)
  const dragField = ref('')   // 当前拖拽的字段
  const startIndex = ref(-1)  // 起点行 index
  const endIndex = ref(-1)    // 当前末端 index

  function isDragging() {
    return dragging.value
  }

  function isInRange(field, index) {
    if (!dragging.value || dragField.value !== field) return false
    if (startIndex.value < 0 || endIndex.value < 0) return false
    const lo = Math.min(startIndex.value, endIndex.value)
    const hi = Math.max(startIndex.value, endIndex.value)
    return index >= lo && index <= hi
  }

  function startDrag(field, index) {
    dragging.value = true
    dragField.value = field
    startIndex.value = index
    endIndex.value = index

    const onMove = () => { /* mouseenter 在格子上回调,这里仅持有 mouseup */ }
    const onUp = () => {
      // 应用填充
      const rows = getRows() || []
      const lo = Math.min(startIndex.value, endIndex.value)
      const hi = Math.max(startIndex.value, endIndex.value)
      const sourceRow = rows[startIndex.value]
      if (sourceRow && hi > lo) {
        const value = sourceRow[field]
        const ids = []
        for (let i = lo; i <= hi; i++) {
          if (i === startIndex.value) continue
          if (rows[i]) ids.push(rows[i].id)
        }
        if (ids.length) onApply?.(field, ids, value)
      }
      dragging.value = false
      dragField.value = ''
      startIndex.value = -1
      endIndex.value = -1
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  function handleEnter(field, index) {
    if (!dragging.value || dragField.value !== field) return
    endIndex.value = index
  }

  return {
    isDragging,
    isInRange,
    startDrag,
    handleEnter
  }
}
