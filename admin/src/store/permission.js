import { defineStore } from 'pinia'
import { ref, computed, h } from 'vue'
import { RouterView } from 'vue-router'
import { constantRoutes } from '@/router'
import router from '@/router'
import { getMenus, getAccessibleMenus } from '@/api/menu'
import { PLATFORMS } from '@/constants/auth'

function getComponentMap() {
  const Layout = () => import('@/layout/index.vue')
  const modules = import.meta.glob('../views/**/*.vue')

  const map = {
    Layout
  }

  for (const filePath in modules) {
    const key = filePath.replace('../views/', '').replace('.vue', '')
    map[key] = modules[filePath]
  }

  return map
}

function resolveComponent(componentMap, componentPath) {
  if (!componentPath || componentPath === 'Layout') return componentMap[componentPath]
  if (componentMap[componentPath]) return componentMap[componentPath]
  if (componentMap[`${componentPath}/index`]) return componentMap[`${componentPath}/index`]

  const withoutIndex = componentPath.replace(/\/index$/, '')
  if (componentMap[withoutIndex]) return componentMap[withoutIndex]

  return null
}

function sortMenus(menus = []) {
  return [...menus].sort((a, b) => (a.sort || 0) - (b.sort || 0))
}

function buildMenuTree(menus) {
  const menuMap = {}
  const tree = []

  sortMenus(menus).forEach(menu => {
    menuMap[menu.id] = { ...menu, children: [] }
  })

  sortMenus(menus).forEach(menu => {
    const current = menuMap[menu.id]
    if (menu.parentId === null || menu.parentId === undefined || menu.parentId === 0 || menu.parentId === '') {
      tree.push(current)
      return
    }
    const parent = menuMap[menu.parentId]
    if (parent) {
      parent.children.push(current)
      parent.children = sortMenus(parent.children)
    }
  })

  const trimChildren = (items) => {
    items.forEach(item => {
      if (item.children?.length) {
        trimChildren(item.children)
      } else {
        delete item.children
      }
    })
  }

  trimChildren(tree)
  return sortMenus(tree)
}

function filterMenusByAccess(menus, roles, platform) {
  return menus.reduce((result, menu) => {
    const current = { ...menu }

    if (platform && current.meta?.platform && current.meta.platform !== platform) {
      return result
    }

    if (current.meta?.roles?.length) {
      const hasRole = roles.some(role => current.meta.roles.includes(role))
      if (!hasRole) return result
    }

    if (current.children?.length) {
      current.children = filterMenusByAccess(current.children, roles, null)
    }

    result.push(current)
    return result
  }, [])
}

function filterMenusByPlatform(menus, platform) {
  if (!platform) return menus
  return menus.reduce((result, menu) => {
    const current = { ...menu }
    if (current.meta?.platform && current.meta.platform !== platform) {
      return result
    }
    if (current.children?.length) {
      current.children = filterMenusByPlatform(current.children, platform)
    }
    result.push(current)
    return result
  }, [])
}

function computeRedirect(menu) {
  const walk = (item, parentPath) => {
    const fullPath = item.path.startsWith('/')
      ? item.path
      : `${parentPath}/${item.path}`.replace(/\/+/g, '/')

    if (item.children?.length) {
      return walk(item.children[0], fullPath)
    }

    if (!item.component && item.redirect) {
      return item.redirect
    }

    if (!item.component) {
      return null
    }

    return fullPath
  }

  if (menu.children?.length) {
    return walk(menu.children[0], menu.path) || menu.redirect || null
  }

  return menu.redirect || null
}

function normalizeMenusResponse(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.rows)) return payload.rows
  if (Array.isArray(payload?.list)) return payload.list
  if (Array.isArray(payload?.records)) return payload.records
  return []
}

function convertMenusToRoutes(menus) {
  const routes = []
  const componentMap = getComponentMap()
  const Layout = componentMap.Layout

  menus.forEach(menu => {
    if (menu.meta?.hidden && !menu.component && !menu.children?.length) {
      return
    }

    const route = {
      path: menu.path,
      name: menu.name,
      meta: menu.meta || {}
    }

    const computedRedirect = computeRedirect(menu)
    if (computedRedirect) {
      route.redirect = computedRedirect
    }

    if (!menu.parentId) {
      if (menu.component && menu.component !== 'Layout') {
        const pageComponent = resolveComponent(componentMap, menu.component)
        if (!pageComponent) {
          if (!menu.meta?.hidden) {
            console.warn(`组件未找到: ${menu.component}`)
          }
          return
        }

        route.component = Layout
        route.redirect = route.redirect || `${menu.path}/index`.replace(/\/+/g, '/')
        route.children = [
          {
            path: 'index',
            name: `${menu.name}Page`,
            component: pageComponent,
            meta: menu.meta || {}
          }
        ]

        if (menu.children?.length) {
          route.children.push(...convertMenusToRoutes(menu.children))
        }
      } else {
        route.component = Layout
        if (menu.children?.length) {
          route.children = convertMenusToRoutes(menu.children)
        }
      }
    } else {
      if (menu.component && menu.component !== 'Layout') {
        const component = resolveComponent(componentMap, menu.component)
        if (!component) {
          if (!menu.meta?.hidden) {
            console.warn(`组件未找到: ${menu.component}`)
          }
          return
        }
        route.component = component
      } else if (menu.children?.length) {
        route.component = { render: () => h(RouterView) }
      }

      if (menu.children?.length) {
        route.children = convertMenusToRoutes(menu.children)
      }
    }

    routes.push(route)
  })

  return routes
}

export const usePermissionStore = defineStore('permission', () => {
  const routes = ref([])
  const addRoutes = ref([])
  const menuTree = ref([])
  const routesLoaded = ref(false)
  const dynamicRouteNames = new Set()
  const NOT_FOUND_ROUTE_NAME = 'DynamicNotFound'

  const topTabs = computed(() => {
    return menuTree.value
      .filter(menu => !menu.parentId && !menu.meta?.hidden)
      .map(menu => ({
        id: menu.id,
        name: menu.name,
        path: menu.path,
        redirect: computeRedirect(menu),
        meta: menu.meta || {},
        children: menu.children || []
      }))
  })

  const generateRoutes = async (roles, platform) => {
    const res = await getAccessibleMenus()
    const menus = normalizeMenusResponse(res.data)

    if (!Array.isArray(menus)) {
      throw new Error('菜单接口返回格式不正确')
    }

    const tree = buildMenuTree(menus)
    const accessedMenus = filterMenusByPlatform(tree, platform)
    const accessedRoutes = convertMenusToRoutes(accessedMenus)

    menuTree.value = accessedMenus
    addRoutes.value = accessedRoutes
    routes.value = constantRoutes.concat(accessedRoutes)
    routesLoaded.value = true

    return accessedRoutes
  }

  const resetRoutes = () => {
    // 从 Vue Router 中移除所有动态路由
    dynamicRouteNames.forEach(name => {
      if (router.hasRoute(name)) {
        router.removeRoute(name)
      }
    })
    dynamicRouteNames.clear()
    if (router.hasRoute(NOT_FOUND_ROUTE_NAME)) {
      router.removeRoute(NOT_FOUND_ROUTE_NAME)
    }

    // 重置 Pinia 状态
    routes.value = []
    addRoutes.value = []
    menuTree.value = []
    routesLoaded.value = false
  }

  // 注册动态路由到 Vue Router
  const installRoutes = (routeList) => {
    routeList.forEach(route => {
      router.addRoute(route)
      if (route.name) {
        dynamicRouteNames.add(route.name)
      }
    })
    if (!router.hasRoute(NOT_FOUND_ROUTE_NAME)) {
      router.addRoute({
        path: '/:pathMatch(.*)*',
        name: NOT_FOUND_ROUTE_NAME,
        redirect: '/404',
        meta: { hidden: true }
      })
    }
  }

  return {
    routes,
    addRoutes,
    menuTree,
    topTabs,
    routesLoaded,
    generateRoutes,
    resetRoutes,
    installRoutes
  }
})
