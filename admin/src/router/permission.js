import router from './index'
import { useUserStore } from '@/store/user'
import { usePermissionStore } from '@/store/permission'
import { useAppStore } from '@/store/app'
import { ElMessage } from 'element-plus'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import Cookies from 'js-cookie'
import { PLATFORMS } from '@/constants/auth'

NProgress.configure({ showSpinner: false })

const whiteList = ['/login', '/404', '/401']

const getDefaultHome = () => '/ai-demo'

const ensureRoutes = async (userStore, permissionStore, appStore) => {
  if (permissionStore.routesLoaded) return false

  permissionStore.resetRoutes()

  const accessRoutes = await permissionStore.generateRoutes(userStore.roles, appStore.currentPlatform)
  permissionStore.installRoutes(accessRoutes)

  const activeTabExists = permissionStore.topTabs.some(tab => String(tab.id) === appStore.activeTabId)
  if (!activeTabExists) {
    appStore.setActiveTab(permissionStore.topTabs[0]?.id || '')
  }

  return true
}

// 根据路由路径自动识别所属的顶级 tab
const findTabByPath = (path, topTabs) => {
  // 按路径长度降序排序，优先匹配更长的路径（避免 /platform-config 被 /platform 误匹配）
  const sortedTabs = [...topTabs].sort((a, b) => b.path.length - a.path.length)

  for (const tab of sortedTabs) {
    if (path === tab.path || path.startsWith(`${tab.path}/`)) {
      return tab
    }
  }

  return null
}

router.beforeEach(async (to, from, next) => {
  NProgress.start()

  if (to.path === '/ai-demo' || to.path.startsWith('/ai-demo/')) {
    next()
    return
  }

  const hasToken = Cookies.get('Admin-Token')

  if (!hasToken) {
    if (whiteList.includes(to.path)) {
      next()
    } else {
      next(`/login?redirect=${to.fullPath}`)
      NProgress.done()
    }
    return
  }

  const userStore = useUserStore()
  const permissionStore = usePermissionStore()
  const appStore = useAppStore()

  if (to.path === '/login') {
    try {
      if (!userStore.roles.length) {
        await userStore.getInfo()
      }
      await ensureRoutes(userStore, permissionStore, appStore)
      next({ path: getDefaultHome(appStore.currentPlatform, permissionStore), replace: true })
    } catch (error) {
      await userStore.userLogout()
      ElMessage.error(error?.message || '初始化失败')
      next('/login')
    }
    NProgress.done()
    return
  }

  try {
    if (!userStore.roles.length) {
      await userStore.getInfo()
    }

    const routesInitialized = await ensureRoutes(userStore, permissionStore, appStore)

    // 根路径始终重定向到默认首页
    if (to.path === '/') {
      appStore.setPlatformSwitching(false)
      const homePath = getDefaultHome(appStore.currentPlatform, permissionStore)
      console.log('[路由守卫] 根路径重定向:', {
        topTabs: permissionStore.topTabs,
        homePath,
        routesLoaded: permissionStore.routesLoaded
      })
      next({ path: homePath, replace: true })
      return
    }

    // 根据当前路由自动识别并设置正确的 activeTabId（必须在 routesInitialized 判断之前执行）
    const matchedTab = findTabByPath(to.path, permissionStore.topTabs)
    if (matchedTab && String(matchedTab.id) !== appStore.activeTabId) {
      appStore.setActiveTab(matchedTab.id)
    }

    // 首次加载动态路由后，重新导航以匹配新注册的路由
    if (routesInitialized) {
      if (to.path !== '/') {
        appStore.setPlatformSwitching(false)
      }
      next({ path: to.fullPath, replace: true })
      return
    }

    const isAdminRoute = to.matched.some(record => record.meta?.platform === PLATFORMS.ADMIN)
    if (isAdminRoute && !userStore.canAccessAdmin) {
      next('/401')
      NProgress.done()
      return
    }

    next()
    appStore.setPlatformSwitching(false)
  } catch (error) {
    appStore.setPlatformSwitching(false)
    permissionStore.resetRoutes()
    await userStore.userLogout()
    ElMessage.error(error?.message || '菜单加载失败，请确认登录、用户信息和菜单接口均已接通')
    next(`/login?redirect=${to.fullPath}`)
    NProgress.done()
  }
})

router.afterEach(() => {
  NProgress.done()
})

// 路由组件加载失败处理（部署更新后旧 chunk 丢失等场景）
router.onError((error) => {
  const isChunkLoadFailed = /Loading chunk|Failed to fetch dynamically imported module|Unable to preload CSS/i.test(error.message)
  if (isChunkLoadFailed) {
    console.warn('页面资源加载失败，正在刷新...', error.message)
    window.location.reload()
  }
})
