<template>
  <div class="tags-view-container">
    <el-scrollbar class="tags-view-wrapper">
      <router-link
        v-for="tag in visitedViews"
        :key="tag.path"
        :class="isActive(tag) ? 'active' : ''"
        :to="{ path: tag.path, query: tag.query }"
        class="tags-view-item"
        @contextmenu.prevent="openMenu(tag, $event)"
      >
        {{ tag.title }}
        <el-icon
          v-if="!isAffix(tag)"
          class="el-icon-close"
          @click.prevent.stop="closeSelectedTag(tag)"
        >
          <Close />
        </el-icon>
      </router-link>
    </el-scrollbar>

    <!-- 右键菜单 -->
    <ul
      v-show="visible"
      :style="{ left: left + 'px', top: top + 'px' }"
      class="contextmenu"
    >
      <li @click="refreshSelectedTag(selectedTag)">
        <el-icon><RefreshRight /></el-icon> 刷新页面
      </li>
      <li v-if="!isAffix(selectedTag)" @click="closeSelectedTag(selectedTag)">
        <el-icon><Close /></el-icon> 关闭当前
      </li>
      <li @click="closeOthersTags">
        <el-icon><CircleClose /></el-icon> 关闭其他
      </li>
      <li @click="closeAllTags(selectedTag)">
        <el-icon><CircleClose /></el-icon> 关闭所有
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTagsViewStore } from '@/store/tagsView'
import { usePermissionStore } from '@/store/permission'
import { useAppStore } from '@/store/app'
import { Close, RefreshRight, CircleClose } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const tagsViewStore = useTagsViewStore()
const permissionStore = usePermissionStore()
const appStore = useAppStore()

const visible = ref(false)
const top = ref(0)
const left = ref(0)
const selectedTag = ref({})
const affixTags = ref([])

const visitedViews = computed(() => tagsViewStore.visitedViews)
const activeTab = computed(() => {
  return permissionStore.topTabs.find(tab => String(tab.id) === appStore.activeTabId) || permissionStore.topTabs[0]
})

const isActive = (tag) => tag.path === route.path
const isAffix = (tag) => tag.meta && tag.meta.affix

const getDefaultHome = () => {
  if (!activeTab.value) return '/'
  if (activeTab.value.redirect) return activeTab.value.redirect

  const findFirstLeaf = (menu, parentPath) => {
    const fullPath = menu.path.startsWith('/')
      ? menu.path
      : `${parentPath}/${menu.path}`.replace(/\/+/g, '/')

    if (menu.children?.length) {
      return findFirstLeaf(menu.children[0], fullPath)
    }

    return fullPath
  }

  if (activeTab.value.children?.length) {
    return findFirstLeaf(activeTab.value.children[0], activeTab.value.path)
  }

  return `${activeTab.value.path}/index`.replace(/\/+/g, '/')
}

const filterAffixTags = (routes, basePath = '') => {
  let tags = []
  routes.forEach(routeItem => {
    const fullPath = basePath
      ? `${basePath}/${routeItem.path}`.replace(/\/+/g, '/')
      : routeItem.path.startsWith('/') ? routeItem.path : `/${routeItem.path}`

    if (routeItem.meta?.affix) {
      tags.push({
        fullPath,
        path: fullPath,
        name: routeItem.name,
        meta: { ...routeItem.meta },
        title: routeItem.meta.title
      })
    }

    if (routeItem.children?.length) {
      tags = tags.concat(filterAffixTags(routeItem.children, fullPath))
    }
  })
  return tags
}

const resetAffixTags = () => {
  tagsViewStore.reset()
  const affix = filterAffixTags(activeTab.value?.children || [], activeTab.value?.path || '')
  const uniqueAffix = affix.filter((tag, index, list) => list.findIndex(item => item.path === tag.path) === index)
  affixTags.value = uniqueAffix
  uniqueAffix.forEach(tag => {
    if (tag.name) {
      tagsViewStore.addVisitedView(tag)
    }
  })
}

const addTags = () => {
  if (!route.name || !activeTab.value || appStore.isPlatformSwitching) return
  // 精确匹配：确保路径完全相等或以 "tab路径/" 开头（避免 /platform-config 被 /platform 误匹配）
  const belongsToActiveTab = route.path === activeTab.value.path || route.path.startsWith(`${activeTab.value.path}/`)
  // 额外检查：如果路径不是以 "/" 结尾，确保下一个字符是 "/"
  const isExactMatch = route.path === activeTab.value.path ||
    (route.path.startsWith(activeTab.value.path) && route.path[activeTab.value.path.length] === '/')
  if (!isExactMatch) return
  tagsViewStore.addView(route)
}

const refreshSelectedTag = (view) => {
  tagsViewStore.delCachedView(view).then(() => {
    const target = view.fullPath || view.path
    nextTick(() => {
      router.replace({ path: '/404', query: { redirect: target } }).then(() => {
        router.replace(target)
      })
    })
  })
}

const closeSelectedTag = (view) => {
  tagsViewStore.delView(view).then(({ visitedViews }) => {
    if (isActive(view)) {
      toLastView(visitedViews)
    }
  })
}

const closeOthersTags = () => {
  router.push(selectedTag.value)
  tagsViewStore.delOthersViews(selectedTag.value)
}

const closeAllTags = (view) => {
  tagsViewStore.delAllViews().then(({ visitedViews }) => {
    if (affixTags.value.some(tag => tag.path === view.path)) {
      return
    }
    toLastView(visitedViews)
  })
}

const toLastView = (views) => {
  const latestView = views.slice(-1)[0]
  router.push(latestView?.fullPath || latestView?.path || getDefaultHome())
}

const openMenu = (tag, e) => {
  const menuMinWidth = 105
  const offsetLeft = e.clientX
  const offsetWidth = document.body.offsetWidth
  const maxLeft = offsetWidth - menuMinWidth

  left.value = offsetLeft > maxLeft ? maxLeft : offsetLeft
  top.value = e.clientY
  visible.value = true
  selectedTag.value = tag
}

const closeMenu = () => {
  visible.value = false
}

watch(() => route.path, addTags)
watch(() => appStore.activeTabId, () => {
  resetAffixTags()
  addTags()
})
watch(() => permissionStore.routesLoaded, (loaded) => {
  if (loaded) {
    resetAffixTags()
    addTags()
  }
}, { immediate: true })
watch(visible, (value) => {
  if (value) {
    document.body.addEventListener('click', closeMenu)
  } else {
    document.body.removeEventListener('click', closeMenu)
  }
})

onMounted(() => {
  resetAffixTags()
  addTags()
})

onBeforeUnmount(() => {
  document.body.removeEventListener('click', closeMenu)
})
</script>

<style lang="scss" scoped>
.tags-view-container {
  height: var(--tags-height);
  width: 100%;
  background: var(--bg-header);
  display: flex;
  align-items: flex-end;
  padding: 0 12px;
  box-sizing: border-box;
  border-bottom: 1px solid var(--border-color);

  .tags-view-wrapper {
    white-space: nowrap;
    flex: 1;
    overflow: hidden;

    :deep(.el-scrollbar) {
      height: 100%;
    }

    :deep(.el-scrollbar__wrap) {
      height: 100%;
    }

    :deep(.el-scrollbar__view) {
      display: flex;
      align-items: stretch;
      height: 100%;
    }

    // 简约下划线风格
    .tags-view-item {
      display: inline-flex;
      align-items: center;
      position: relative;
      cursor: pointer;
      color: var(--text-secondary);
      background: transparent;
      padding: 0 16px;
      font-size: 13px;
      text-decoration: none;
      transition: all 0.2s;
      border: none;
      border-bottom: 2px solid transparent;

      &:hover {
        color: var(--primary-color);
        background: rgba(var(--primary-color-rgb), 0.04);
      }

      &.active {
        color: var(--primary-color);
        font-weight: 500;
        border-bottom-color: var(--primary-color);
        background: transparent;

        .el-icon-close {
          color: var(--primary-color);
        }
      }

      .el-icon-close {
        width: 16px;
        height: 16px;
        margin-left: 6px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        color: var(--text-light);
        transition: all 0.2s;

        &:hover {
          background-color: var(--bg-hover);
          color: var(--danger-color);
        }
      }
    }
  }

  .contextmenu {
    margin: 0;
    background: var(--bg-card);
    z-index: 3000;
    position: absolute;
    list-style-type: none;
    padding: 6px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 400;
    color: var(--text-primary);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
    border: 1px solid var(--border-color);

    li {
      margin: 0;
      padding: 8px 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      border-radius: 6px;
      transition: all 0.2s;

      &:hover {
        background: var(--bg-hover);
        color: var(--primary-color);
      }

      .el-icon {
        font-size: 14px;
      }
    }
  }
}
</style>
