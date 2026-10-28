<template>
  <div class="condition-builder">
    <div v-if="!modelValue" class="empty-state">
      <el-button type="primary" @click="initCondition">添加条件</el-button>
    </div>
    <ConditionGroup
      v-else
      :value="modelValue"
      :fields="fields"
      :level="0"
      @update="handleUpdate"
      @remove="handleRemove"
    />
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'
import ConditionGroup from './ConditionGroup.vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: null
  },
  fields: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])

function initCondition() {
  emit('update:modelValue', {
    type: 'group',
    operator: 'AND',
    conditions: []
  })
}

function handleUpdate(newValue) {
  emit('update:modelValue', newValue)
}

function handleRemove() {
  emit('update:modelValue', null)
}
</script>

<style scoped>
.condition-builder {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 12px;
  background: #f5f7fa;
}

.empty-state {
  text-align: center;
  padding: 20px;
}
</style>
