<template>
  <el-select
    :model-value="modelValue"
    placeholder="选择多个值"
    size="small"
    multiple
    style="width: 200px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <el-option
      v-for="option in field.options"
      :key="option.value"
      :label="option.label"
      :value="option.value"
    />
  </el-select>
</template>

<script setup>
defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  field: {
    type: Object,
    required: true
  }
})

defineEmits(['update:modelValue'])
</script>
