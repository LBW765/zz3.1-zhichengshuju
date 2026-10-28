import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTagsViewStore = defineStore('tagsView', () => {
  const visitedViews = ref([])
  const cachedViews = ref([])

  // 添加访问的视图
  const addView = (view) => {
    addVisitedView(view)
    addCachedView(view)
  }

  // 添加已访问的标签
  const addVisitedView = (view) => {
    if (visitedViews.value.some(v => v.path === view.path)) return
    visitedViews.value.push(
      Object.assign({}, view, {
        title: view.meta?.title || 'no-name'
      })
    )
  }

  // 添加缓存的视图
  const addCachedView = (view) => {
    if (cachedViews.value.includes(view.name)) return
    if (view.meta && !view.meta.noCache) {
      cachedViews.value.push(view.name)
    }
  }

  // 删除视图
  const delView = (view) => {
    return new Promise(resolve => {
      delVisitedView(view)
      delCachedView(view)
      resolve({
        visitedViews: [...visitedViews.value],
        cachedViews: [...cachedViews.value]
      })
    })
  }

  // 删除已访问的标签
  const delVisitedView = (view) => {
    for (const [i, v] of visitedViews.value.entries()) {
      if (v.path === view.path) {
        visitedViews.value.splice(i, 1)
        break
      }
    }
  }

  // 删除缓存的视图
  const delCachedView = (view) => {
    return new Promise(resolve => {
      const index = cachedViews.value.indexOf(view.name)
      index > -1 && cachedViews.value.splice(index, 1)
      resolve([...cachedViews.value])
    })
  }

  // 删除其他视图
  const delOthersViews = (view) => {
    return new Promise(resolve => {
      delOthersVisitedViews(view)
      delOthersCachedViews(view)
      resolve({
        visitedViews: [...visitedViews.value],
        cachedViews: [...cachedViews.value]
      })
    })
  }

  // 删除其他已访问的标签
  const delOthersVisitedViews = (view) => {
    visitedViews.value = visitedViews.value.filter(v => {
      return v.meta?.affix || v.path === view.path
    })
  }

  // 删除其他缓存的视图
  const delOthersCachedViews = (view) => {
    const index = cachedViews.value.indexOf(view.name)
    if (index > -1) {
      cachedViews.value = cachedViews.value.slice(index, index + 1)
    } else {
      cachedViews.value = []
    }
  }

  // 删除所有视图
  const delAllViews = () => {
    return new Promise(resolve => {
      delAllVisitedViews()
      delAllCachedViews()
      resolve({
        visitedViews: [...visitedViews.value],
        cachedViews: [...cachedViews.value]
      })
    })
  }

  // 删除所有已访问的标签
  const delAllVisitedViews = () => {
    visitedViews.value = visitedViews.value.filter(tag => tag.meta?.affix)
  }

  // 删除所有缓存的视图
  const delAllCachedViews = () => {
    cachedViews.value = []
  }

  // 完全重置标签状态（用于平台切换、退出登录）
  const reset = () => {
    visitedViews.value = []
    cachedViews.value = []
  }

  return {
    visitedViews,
    cachedViews,
    addView,
    addVisitedView,
    addCachedView,
    delView,
    delCachedView,
    delOthersViews,
    delAllViews,
    reset
  }
})
