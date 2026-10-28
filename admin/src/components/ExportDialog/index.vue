<template>
  <el-dialog
    v-model="visible"
    :title="title"
    width="720px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <el-form label-width="92px">
      <el-form-item label="导出范围">
        <el-radio-group v-model="scope">
          <el-radio-button v-if="allowSelected" value="selected" :disabled="!selectedCount">
            已勾选数据{{ selectedCount ? `（${selectedCount}）` : '' }}
          </el-radio-button>
          <el-radio-button value="currentPage">当前页数据{{ currentPageCount ? `（${currentPageCount}）` : '' }}</el-radio-button>
          <el-radio-button value="allFiltered">全部筛选结果{{ totalCount ? `（${totalCount}）` : '' }}</el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="导出字段">
        <div class="field-panel">
          <div class="field-panel__toolbar">
            <el-checkbox
              v-model="allChecked"
              :indeterminate="isIndeterminate"
              @change="handleCheckAllChange"
            >
              全选字段
            </el-checkbox>
            <span class="field-panel__count">已选 {{ checkedFields.length }} / {{ fields.length }}</span>
          </div>
          <el-checkbox-group v-model="checkedFields" class="field-panel__grid">
            <el-checkbox v-for="field in fields" :key="field.key" :label="field.key">
              {{ field.label }}
            </el-checkbox>
          </el-checkbox-group>
        </div>
      </el-form-item>

      <el-alert
        title="导出会按当前页面筛选条件和所选字段生成 Excel 文件。"
        type="info"
        :closable="false"
        show-icon
      />
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="exporting" @click="handleConfirm">确认导出</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '导出数据' },
  fields: { type: Array, required: true },
  selectedCount: { type: Number, default: 0 },
  currentPageCount: { type: Number, default: 0 },
  totalCount: { type: Number, default: 0 },
  allowSelected: { type: Boolean, default: true },
  exportFn: { type: Function, required: true }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const scope = ref('allFiltered')
const checkedFields = ref([])
const exporting = ref(false)

const defaultFieldKeys = computed(() => {
  const defaults = props.fields.filter(field => field.default !== false).map(field => field.key)
  return defaults.length ? defaults : props.fields.map(field => field.key)
})

const allChecked = computed({
  get: () => checkedFields.value.length === props.fields.length && props.fields.length > 0,
  set: val => handleCheckAllChange(val)
})

const isIndeterminate = computed(() => checkedFields.value.length > 0 && checkedFields.value.length < props.fields.length)

function reset() {
  scope.value = props.selectedCount ? 'selected' : 'allFiltered'
  checkedFields.value = [...defaultFieldKeys.value]
  exporting.value = false
}

function handleCheckAllChange(val) {
  checkedFields.value = val ? props.fields.map(field => field.key) : []
}

async function handleConfirm() {
  if (scope.value === 'selected' && !props.selectedCount) {
    ElMessage.warning('请先勾选要导出的数据')
    return
  }
  if (!checkedFields.value.length) {
    ElMessage.warning('请至少选择一个导出字段')
    return
  }

  exporting.value = true
  try {
    await props.exportFn({ scope: scope.value, fields: checkedFields.value })
    emit('success')
    visible.value = false
  } finally {
    exporting.value = false
  }
}

function handleClosed() {
  reset()
}

watch(visible, val => {
  if (val) reset()
})
</script>

<style lang="scss" scoped>
.field-panel {
  width: 100%;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  padding: 12px;

  &__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  &__count {
    font-size: 13px;
    color: var(--text-secondary);
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px 12px;
  }
}
</style>
