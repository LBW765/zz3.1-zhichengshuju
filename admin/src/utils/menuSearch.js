import path from 'path-browserify'

/**
 * 递归提取菜单树中所有叶子菜单（可导航的页面）
 */
export function flattenMenus(menuTree, parentPath = '', breadcrumbTrail = []) {
  const result = []

  for (const menu of menuTree) {
    if (menu.meta?.hidden) continue

    const fullPath = menu.path.startsWith('/')
      ? menu.path
      : path.resolve(parentPath, menu.path)

    const currentBreadcrumb = [...breadcrumbTrail, menu.meta?.title].filter(Boolean)

    if (menu.children?.length) {
      // 有子菜单，递归
      const visibleChildren = menu.children.filter(c => !c.meta?.hidden)
      if (visibleChildren.length) {
        result.push(...flattenMenus(visibleChildren, fullPath, currentBreadcrumb))
        continue
      }
    }

    // 叶子菜单
    if (menu.meta?.title) {
      result.push({
        id: menu.id,
        title: menu.meta.title,
        icon: menu.meta.icon || '',
        path: fullPath,
        breadcrumb: currentBreadcrumb
      })
    }
  }

  return result
}

/**
 * 搜索匹配菜单
 */
export function searchMenus(flatMenus, keyword) {
  if (!keyword?.trim()) return []

  const kw = keyword.trim().toLowerCase()
  const matched = []

  for (const item of flatMenus) {
    const titleLower = item.title.toLowerCase()
    const pathLower = item.path.toLowerCase()
    const breadcrumbStr = item.breadcrumb.join('').toLowerCase()

    let score = 0
    if (titleLower.startsWith(kw)) {
      score = 4
    } else if (titleLower.includes(kw)) {
      score = 3
    } else if (breadcrumbStr.includes(kw)) {
      score = 2
    } else if (pathLower.includes(kw)) {
      score = 1
    }

    if (score > 0) {
      matched.push({ ...item, _score: score })
    }
  }

  matched.sort((a, b) => b._score - a._score)
  return matched.slice(0, 10)
}

/**
 * 高亮匹配文本，返回 HTML 字符串
 */
export function highlightText(text, keyword) {
  if (!keyword?.trim()) return text

  const escaped = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  return text.replace(regex, '<em>$1</em>')
}
