<template>
  <Teleport to="body">
    <Transition name="search-fade">
      <div v-if="visible" class="search-overlay" @click.self="close">
        <div class="search-panel">
          <!-- 搜索框 -->
          <div class="search-input-wrapper">
            <el-icon class="search-icon"><Search /></el-icon>
            <input
              ref="inputRef"
              v-model="keyword"
              placeholder="搜索菜单..."
              class="search-input"
              @keydown="handleKeydown"
            />
            <kbd class="shortcut-hint">ESC</kbd>
          </div>

          <!-- 搜索结果区域 -->
          <template v-if="keyword.trim()">
            <div class="search-divider"></div>
            <div class="search-results" ref="resultsRef">
              <div v-if="results.length === 0" class="search-empty">
                <el-icon><InfoFilled /></el-icon>
                <span>未找到匹配的菜单</span>
              </div>
              <div
                v-for="(item, index) in results"
                :key="item.id"
                class="search-result-item"
                :class="{ active: index === activeIndex }"
                @click="navigate(item)"
                @mouseenter="activeIndex = index"
              >
                <el-icon class="result-icon">
                  <component :is="item.icon || 'Document'" />
                </el-icon>
                <div class="result-info">
                  <span class="result-title" v-html="getHighlightedTitle(item.title)"></span>
                  <span class="result-breadcrumb">{{ item.breadcrumb.join(' / ') }}</span>
                </div>
                <el-icon class="result-enter"><Right /></el-icon>
              </div>
            </div>
          </template>

          <!-- 历史记录区域（未输入关键词时显示） -->
          <template v-else-if="searchHistory.length">
            <div class="search-divider"></div>
            <div class="search-history">
              <div class="history-header">
                <span class="history-title">最近搜索</span>
                <span class="history-clear" @click="clearHistory">清空</span>
              </div>
              <div class="search-results" ref="resultsRef">
                <div
                  v-for="(item, index) in searchHistory"
                  :key="item.path"
                  class="search-result-item"
                  :class="{ active: index === activeIndex }"
                  @click="navigate(item)"
                  @mouseenter="activeIndex = index"
                >
                  <el-icon class="result-icon">
                    <component :is="item.icon || 'Document'" />
                  </el-icon>
                  <div class="result-info">
                    <span class="result-title">{{ item.title }}</span>
                    <span class="result-breadcrumb">{{ item.breadcrumb.join(' / ') }}</span>
                  </div>
                  <el-icon class="result-remove" @click.stop="removeHistory(index)"><Close /></el-icon>
                </div>
              </div>
            </div>
          </template>

          <!-- 底部提示 -->
          <div class="search-footer">
            <span><kbd>↑</kbd><kbd>↓</kbd> 导航</span>
            <span><kbd>↵</kbd> 跳转</span>
            <span><kbd>ESC</kbd> 关闭</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePermissionStore } from '@/store/permission'
import { useUserStore } from '@/store/user'
import { flattenMenus, searchMenus, highlightText } from '@/utils/menuSearch'
import { Search, InfoFilled, Right, Close, Document } from '@element-plus/icons-vue'

const props = defineProps({
  visible: { type: Boolean, default: false }
})
const emit = defineEmits(['update:visible'])

const router = useRouter()
const permissionStore = usePermissionStore()
const userStore = useUserStore()

const inputRef = ref(null)
const resultsRef = ref(null)
const keyword = ref('')
const activeIndex = ref(0)

// 扁平化菜单列表
const flatMenus = computed(() => flattenMenus(permissionStore.menuTree))

// 搜索结果
const results = computed(() => searchMenus(flatMenus.value, keyword.value))

// 当前可导航列表（搜索结果或历史记录）
const navigableList = computed(() => {
  if (keyword.value.trim()) return results.value
  return searchHistory.value
})

// === 历史搜索记录 ===
const HISTORY_MAX = 10
const getStorageKey = () => `search_history_${userStore.userInfo?.id || 'default'}`

const searchHistory = ref([])

const loadHistory = () => {
  try {
    const raw = localStorage.getItem(getStorageKey())
    searchHistory.value = raw ? JSON.parse(raw) : []
  } catch {
    searchHistory.value = []
  }
}

const saveHistory = () => {
  localStorage.setItem(getStorageKey(), JSON.stringify(searchHistory.value))
}

const addHistory = (item) => {
  // 去重：移除已存在的同路径记录
  const list = searchHistory.value.filter(h => h.path !== item.path)
  // 最新的放最前面
  list.unshift({ id: item.id, title: item.title, icon: item.icon, path: item.path, breadcrumb: item.breadcrumb })
  // 限制条数
  searchHistory.value = list.slice(0, HISTORY_MAX)
  saveHistory()
}

const removeHistory = (index) => {
  searchHistory.value.splice(index, 1)
  saveHistory()
  // 修正 activeIndex
  if (activeIndex.value >= searchHistory.value.length) {
    activeIndex.value = Math.max(0, searchHistory.value.length - 1)
  }
}

const clearHistory = () => {
  searchHistory.value = []
  saveHistory()
  activeIndex.value = 0
}

// 初始化加载
loadHistory()

// keyword 变化时重置选中索引
watch(keyword, () => {
  activeIndex.value = 0
})

// 打开时聚焦 + 刷新历史，关闭时清空关键词
watch(() => props.visible, (val) => {
  if (val) {
    loadHistory()
    nextTick(() => inputRef.value?.focus())
  } else {
    keyword.value = ''
    activeIndex.value = 0
  }
})

// 高亮标题
const getHighlightedTitle = (title) => {
  return highlightText(title, keyword.value)
}

// 跳转
const navigate = (item) => {
  addHistory(item)
  close()
  router.push(item.path)
}

// 关闭
const close = () => {
  emit('update:visible', false)
}

// 键盘导航
const handleKeydown = (e) => {
  const list = navigableList.value
  const len = list.length

  if (e.key === 'Escape') {
    close()
    return
  }

  if (!len) return

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      activeIndex.value = (activeIndex.value + 1) % len
      scrollToActive()
      break
    case 'ArrowUp':
      e.preventDefault()
      activeIndex.value = (activeIndex.value - 1 + len) % len
      scrollToActive()
      break
    case 'Enter':
      e.preventDefault()
      if (list[activeIndex.value]) {
        navigate(list[activeIndex.value])
      }
      break
  }
}

// 滚动到高亮项
const scrollToActive = () => {
  nextTick(() => {
    const container = resultsRef.value
    if (!container) return
    const activeEl = container.querySelector('.search-result-item.active')
    activeEl?.scrollIntoView({ block: 'nearest' })
  })
}

// 全局快捷键 Ctrl+K / Cmd+K
const handleGlobalKeydown = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    emit('update:visible', !props.visible)
  }
}

onMounted(() => document.addEventListener('keydown', handleGlobalKeydown))
onUnmounted(() => document.removeEventListener('keydown', handleGlobalKeydown))
</script>

<style lang="scss" scoped>
.search-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  padding-top: 12vh;
}

.search-panel {
  width: 580px;
  max-height: 70vh;
  background: var(--bg-card);
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  align-self: flex-start;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  gap: 12px;

  .search-icon {
    font-size: 20px;
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 16px;
    color: var(--text-primary);
    background: transparent;

    &::placeholder {
      color: var(--text-secondary);
    }
  }

  .shortcut-hint {
    padding: 2px 8px;
    border-radius: 4px;
    border: 1px solid var(--border-color);
    background: var(--bg-hover);
    color: var(--text-secondary);
    font-size: 12px;
    font-family: inherit;
    line-height: 1.5;
  }
}

.search-divider {
  height: 1px;
  background: var(--border-lighter);
  margin: 0 16px;
}

.search-results {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  max-height: 400px;
}

.search-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 0;
  color: var(--text-secondary);
  font-size: 14px;

  .el-icon {
    font-size: 32px;
    color: var(--text-light);
  }
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover,
  &.active {
    background: rgba(var(--primary-color-rgb), 0.08);
  }

  .result-icon {
    font-size: 18px;
    color: var(--text-secondary);
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: var(--bg-hover);
  }

  .result-info {
    flex: 1;
    min-width: 0;

    .result-title {
      font-size: 14px;
      color: var(--text-primary);
      font-weight: 500;
      display: block;

      :deep(em) {
        color: var(--primary-color);
        font-style: normal;
        font-weight: 600;
      }
    }

    .result-breadcrumb {
      font-size: 12px;
      color: var(--text-secondary);
      margin-top: 2px;
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .result-enter {
    font-size: 14px;
    color: var(--text-light);
    flex-shrink: 0;
  }

  .result-remove {
    font-size: 14px;
    color: var(--text-light);
    flex-shrink: 0;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.15s;

    &:hover {
      color: var(--text-primary);
      background: var(--bg-hover);
    }
  }
}

// 历史记录区域
.search-history {
  display: flex;
  flex-direction: column;

  .history-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px 4px;

    .history-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .history-clear {
      font-size: 12px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: color 0.15s;

      &:hover {
        color: var(--primary-color);
      }
    }
  }
}

.search-footer {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 20px;
  border-top: 1px solid var(--border-lighter);
  font-size: 12px;
  color: var(--text-secondary);

  kbd {
    padding: 1px 5px;
    border-radius: 3px;
    border: 1px solid var(--border-color);
    background: var(--bg-hover);
    font-size: 11px;
    font-family: inherit;
    margin: 0 1px;
  }
}

// 过渡动画
.search-fade-enter-active {
  transition: opacity 0.15s ease;
}
.search-fade-leave-active {
  transition: opacity 0.1s ease;
}
.search-fade-enter-from,
.search-fade-leave-to {
  opacity: 0;
}
</style>
