<template>
  <div class="condition-row">
    <el-select
      v-model="localValue.field"
      placeholder="选择字段"
      size="small"
      style="width: 150px"
      @change="handleFieldChange"
    >
      <el-option
        v-for="field in fields"
        :key="field.key"
        :label="field.label"
        :value="field.key"
      />
    </el-select>

    <el-select
      v-model="localValue.operator"
      placeholder="运算符"
      size="small"
      style="width: 120px"
      @change="emitUpdate"
    >
      <el-option
        v-for="op in availableOperators"
        :key="op.value"
        :label="op.label"
        :value="op.value"
      />
    </el-select>

    <component
      :is="valueInputComponent"
      v-model="localValue.value"
      :field="currentField"
      @update:modelValue="emitUpdate"
    />

    <el-button size="small" type="danger" link @click="$emit('remove')">删除</el-button>
  </div>
</template>

<script setup>
import { ref, computed, watch, defineAsyncComponent } from 'vue'
import { ElInput, ElInputNumber, ElDatePicker, ElSelect, ElOption } from 'element-plus'

const props = defineProps({
  value: {
    type: Object,
    required: true
  },
  fields: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['update', 'remove'])

const localValue = ref({ ...props.value })

watch(() => props.value, (newVal) => {
  localValue.value = { ...newVal }
}, { deep: true })

const currentField = computed(() => {
  return props.fields.find(f => f.key === localValue.value.field)
})

const operatorsByType = {
  string: [
    { value: 'eq', label: '等于' },
    { value: 'ne', label: '不等于' },
    { value: 'contains', label: '包含' },
    { value: 'notContains', label: '不包含' },
    { value: 'startsWith', label: '开头是' },
    { value: 'endsWith', label: '结尾是' }
  ],
  number: [
    { value: 'eq', label: '等于' },
    { value: 'ne', label: '不等于' },
    { value: 'gt', label: '大于' },
    { value: 'gte', label: '大于等于' },
    { value: 'lt', label: '小于' },
    { value: 'lte', label: '小于等于' }
  ],
  date: [
    { value: 'eq', label: '等于' },
    { value: 'ne', label: '不等于' },
    { value: 'gt', label: '晚于' },
    { value: 'gte', label: '不早于' },
    { value: 'lt', label: '早于' },
    { value: 'lte', label: '不晚于' }
  ],
  enum: [
    { value: 'eq', label: '等于' },
    { value: 'ne', label: '不等于' },
    { value: 'in', label: '属于' },
    { value: 'notIn', label: '不属于' }
  ]
}

const availableOperators = computed(() => {
  const fieldType = currentField.value?.type || 'string'
  return operatorsByType[fieldType] || operatorsByType.string
})

const SingleSelect = defineAsyncComponent(() => import('./SingleSelect.vue'))
const MultiSelect = defineAsyncComponent(() => import('./MultiSelect.vue'))

const valueInputComponent = computed(() => {
  if (!currentField.value) return ElInput

  const { type, options } = currentField.value
  const { operator } = localValue.value

  if (options && options.length > 0) {
    if (operator === 'in' || operator === 'notIn') {
      return MultiSelect
    }
    return SingleSelect
  }

  if (type === 'number') return ElInputNumber
  if (type === 'date') return ElDatePicker
  return ElInput
})

function handleFieldChange() {
  const fieldType = currentField.value?.type || 'string'
  const operators = operatorsByType[fieldType] || operatorsByType.string
  localValue.value.operator = operators[0].value
  localValue.value.value = ''
  emitUpdate()
}

function emitUpdate() {
  emit('update', { ...localValue.value })
}
</script>

<style scoped>
.condition-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #fafafa;
  border-radius: 4px;
}
</style>
