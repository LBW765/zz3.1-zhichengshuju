<template>
  <div class="icon-picker">
    <el-popover
      v-model:visible="popoverVisible"
      trigger="click"
      placement="bottom-start"
      :width="560"
      popper-class="icon-picker__popover"
    >
      <template #reference>
        <el-input
          :model-value="modelValue"
          :placeholder="placeholder"
          readonly
          clearable
          @clear="handleClear"
        >
          <template #prefix>
            <el-icon v-if="modelValue" class="icon-picker__input-icon">
              <component :is="modelValue" />
            </el-icon>
          </template>
          <template #append>
            <el-button @click.stop="popoverVisible = true">选择图标</el-button>
          </template>
        </el-input>
      </template>

      <div class="icon-picker__panel">
        <div class="icon-picker__toolbar">
          <el-input
            v-model="keyword"
            :prefix-icon="Search"
            placeholder="搜索图标名称"
            clearable
          />
          <el-button text @click="handleClear">清空</el-button>
        </div>

        <div class="icon-picker__preview" v-if="modelValue">
          <el-icon class="icon-picker__preview-icon">
            <component :is="modelValue" />
          </el-icon>
          <span>{{ modelValue }}</span>
        </div>

        <el-scrollbar max-height="320px">
          <div class="icon-picker__grid">
            <button
              v-for="icon in filteredIcons"
              :key="icon.name"
              type="button"
              class="icon-picker__item"
              :class="{ 'is-active': modelValue === icon.name }"
              @click="selectIcon(icon.name)"
            >
              <el-icon class="icon-picker__item-icon">
                <component :is="icon.component" />
              </el-icon>
              <span class="icon-picker__item-name">{{ icon.name }}</span>
            </button>
          </div>
        </el-scrollbar>
      </div>
    </el-popover>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { Search } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: '请选择图标'
  }
})

const emit = defineEmits(['update:modelValue'])

const popoverVisible = ref(false)
const keyword = ref('')

const icons = Object.entries(ElementPlusIconsVue)
  .map(([name, component]) => ({ name, component }))
  .sort((a, b) => a.name.localeCompare(b.name))

const filteredIcons = computed(() => {
  const value = keyword.value.trim().toLowerCase()
  if (!value) return icons
  return icons.filter(icon => icon.name.toLowerCase().includes(value))
})

function selectIcon(name) {
  emit('update:modelValue', name)
  popoverVisible.value = false
}

function handleClear() {
  emit('update:modelValue', '')
}
</script>

<style lang="scss" scoped>
.icon-picker {
  width: 100%;
}

.icon-picker__panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.icon-picker__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.icon-picker__preview {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--border-light);
  border-radius: 10px;
  background: var(--bg-hover);
  color: var(--text-regular);
}

.icon-picker__preview-icon,
.icon-picker__input-icon,
.icon-picker__item-icon {
  font-size: 18px;
}

.icon-picker__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  padding: 2px;
}

.icon-picker__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 88px;
  padding: 12px 8px;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  background: var(--bg-card);
  color: var(--text-regular);
  cursor: pointer;
  transition: all 0.2s ease;
}

.icon-picker__item:hover {
  border-color: var(--primary-color);
  background: var(--bg-hover);
}

.icon-picker__item.is-active {
  border-color: var(--primary-color);
  background: rgba(var(--primary-color-rgb), 0.08);
  color: var(--primary-color);
}

.icon-picker__item-name {
  width: 100%;
  font-size: 12px;
  line-height: 1.4;
  text-align: center;
  word-break: break-word;
}
</style>
