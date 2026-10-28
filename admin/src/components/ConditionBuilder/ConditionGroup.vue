<template>
  <div class="condition-group" :style="{ marginLeft: level > 0 ? '20px' : '0' }">
    <div class="group-header">
      <el-radio-group v-model="localValue.operator" size="small" @change="emitUpdate">
        <el-radio-button value="AND">并且</el-radio-button>
        <el-radio-button value="OR">或者</el-radio-button>
      </el-radio-group>
      <div class="group-actions">
        <el-button size="small" @click="addCondition">添加条件</el-button>
        <el-button size="small" @click="addGroup">添加条件组</el-button>
        <el-button v-if="level > 0" size="small" type="danger" link @click="$emit('remove')">删除组</el-button>
      </div>
    </div>

    <div class="group-body">
      <div
        v-for="(item, index) in localValue.conditions"
        :key="index"
        class="condition-item"
      >
        <ConditionGroup
          v-if="item.type === 'group'"
          :value="item"
          :fields="fields"
          :level="level + 1"
          @update="(val) => updateChild(index, val)"
          @remove="removeChild(index)"
        />
        <ConditionRow
          v-else
          :value="item"
          :fields="fields"
          @update="(val) => updateChild(index, val)"
          @remove="removeChild(index)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import ConditionRow from './ConditionRow.vue'

const props = defineProps({
  value: {
    type: Object,
    required: true
  },
  fields: {
    type: Array,
    required: true
  },
  level: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['update', 'remove'])

const localValue = ref({ ...props.value })

watch(() => props.value, (newVal) => {
  localValue.value = { ...newVal }
}, { deep: true })

function emitUpdate() {
  emit('update', { ...localValue.value })
}

function addCondition() {
  if (!localValue.value.conditions) {
    localValue.value.conditions = []
  }
  localValue.value.conditions.push({
    type: 'condition',
    field: '',
    operator: 'eq',
    value: ''
  })
  emitUpdate()
}

function addGroup() {
  if (!localValue.value.conditions) {
    localValue.value.conditions = []
  }
  localValue.value.conditions.push({
    type: 'group',
    operator: 'AND',
    conditions: []
  })
  emitUpdate()
}

function updateChild(index, newValue) {
  localValue.value.conditions[index] = newValue
  emitUpdate()
}

function removeChild(index) {
  localValue.value.conditions.splice(index, 1)
  emitUpdate()
}
</script>

<style scoped>
.condition-group {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 12px;
  background: #fff;
  margin-bottom: 8px;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

.group-actions {
  display: flex;
  gap: 8px;
}

.group-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.condition-item {
  position: relative;
}
</style>
