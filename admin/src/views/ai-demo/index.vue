<template>
  <div class="ai-demo">
    <template v-if="isPublic">
      <header class="public-header">
        <router-link class="brand" :to="basePath"><span class="brand__symbol">吉</span><span><strong>吉安 AI</strong><small>新庐陵智城</small></span></router-link>
        <nav class="public-header__nav" aria-label="平台导航">
          <router-link :to="basePath">平台首页</router-link>
          <router-link :to="`${basePath}/services/demands`">供需大厅</router-link>
          <router-link :to="`${basePath}/ai/resources`">AI 服务中心</router-link>
          <router-link :to="`${basePath}/services/pilot`">中试验证</router-link>
          <router-link :to="`${basePath}/ecosystem/events`">产业生态</router-link>
        </nav>
        <div class="public-header__actions">
          <el-tooltip content="搜索资源"><el-button text circle :icon="Search" aria-label="搜索资源" @click="go('/search')" /></el-tooltip>
          <el-button type="primary" :icon="User" @click="go(store.user ? roleHome[store.user.role] : '/login')">{{ store.user ? '进入工作台' : '登录工作台' }}</el-button>
        </div>
      </header>
      <PublicPage :page="publicPage" @navigate="go" />
    </template>

    <template v-else>
      <header class="workspace-topbar">
        <div class="workspace-topbar__left">
          <el-button class="mobile-menu" text circle :icon="Menu" aria-label="打开导航" @click="drawerOpen = true" />
          <router-link class="brand brand--compact" :to="basePath"><span class="brand__symbol">吉</span><span><strong>吉安 AI</strong><small>综合服务平台</small></span></router-link>
          <span class="topbar-divider"></span>
          <div class="breadcrumb"><span>{{ activeGroup.label }}</span><el-icon><ArrowRight /></el-icon><strong>{{ pageTitle }}</strong></div>
        </div>
        <div class="workspace-topbar__right">
          <span class="preview-mark">演示环境</span>
          <el-tooltip content="搜索资源"><el-button text circle :icon="Search" aria-label="搜索资源" @click="go('/search')" /></el-tooltip>
          <el-tooltip content="返回门户"><el-button text circle :icon="House" aria-label="返回门户" @click="go('')" /></el-tooltip>
          <el-dropdown trigger="click" @command="onAccountCommand">
            <el-button :icon="User" class="role-select">{{ roleLabel }} <el-icon><ArrowDown /></el-icon></el-button>
            <template #dropdown><el-dropdown-menu><el-dropdown-item command="switch">切换身份</el-dropdown-item><el-dropdown-item command="logout">退出登录</el-dropdown-item></el-dropdown-menu></template>
          </el-dropdown>
        </div>
      </header>
      <div class="workspace-layout">
        <aside class="icon-rail" aria-label="主导航">
          <router-link class="icon-rail__brand" :to="basePath" aria-label="平台首页">吉</router-link>
          <el-tooltip v-for="group in navigation" :key="group.key" :content="group.label" placement="right"><button class="icon-rail__item" :class="{ active: activeGroup.key === group.key }" :aria-label="group.label" @click="goGroup(group)"><el-icon :size="21"><component :is="group.icon" /></el-icon></button></el-tooltip>
          <div class="icon-rail__spacer"></div>
          <el-tooltip content="返回门户" placement="right"><button class="icon-rail__item" aria-label="返回门户" @click="go('')"><el-icon :size="21"><House /></el-icon></button></el-tooltip>
        </aside>
        <aside class="module-sidebar" aria-label="模块导航">
          <div class="module-sidebar__heading"><span>{{ activeGroup.label }}</span><strong>{{ activeGroupTitle }}</strong></div>
          <div class="module-sidebar__search"><el-icon><Search /></el-icon><span>选择服务模块</span></div>
          <nav><router-link v-for="item in visibleItems" :key="item.path" :to="item.path" :class="{ active: isItemActive(item.path) }"><span>{{ item.label }}</span><el-icon><ArrowRight /></el-icon></router-link></nav>
          <div class="sidebar-footer"><span class="online-dot"></span>吉安市人工智能创新应用综合服务平台</div>
        </aside>
        <main class="workspace-main">
          <WorkspacePage v-if="store.ready" :page="pageKey" :role="store.user?.role || 'public'" @navigate="go" />
          <div v-else class="work-page"><el-skeleton :rows="8" animated /></div>
        </main>
      </div>
      <el-drawer v-model="drawerOpen" title="平台导航" direction="ltr" size="300px" class="mobile-nav-drawer"><div v-for="group in navigation" :key="group.key" class="drawer-group"><strong>{{ group.label }}</strong><button v-for="item in drawerItems(group)" :key="item.path" @click="goAbsolute(item.path); drawerOpen = false">{{ item.label }}</button></div></el-drawer>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowDown, ArrowRight, House, Menu, Search, User } from '@element-plus/icons-vue'
import { useAiDemoStore } from '@/store/aiDemo'
import PublicPage from './public.vue'
import WorkspacePage from './workspace.vue'
import { basePath, navigation } from './navigation'
import './preview.scss'

const route = useRoute()
const router = useRouter()
const store = useAiDemoStore()
const drawerOpen = ref(false)
const roleHome = { enterprise: '/enterprise/workbench', operations: '/operations/applications', government: '/government/overview' }
const localPath = computed(() => route.path.slice(basePath.length) || '')
const isPublic = computed(() => ['', '/', '/search', '/login'].includes(localPath.value))
const publicPage = computed(() => localPath.value === '/search' ? 'search' : localPath.value === '/login' ? 'login' : 'home')
const groupKey = computed(() => localPath.value.startsWith('/services/') ? 'service' : localPath.value.startsWith('/ai/') || localPath.value.startsWith('/detail/') ? 'ai' : localPath.value.startsWith('/ecosystem/') ? 'ecosystem' : 'workspace')
const activeGroup = computed(() => navigation.find(item => item.key === groupKey.value) || navigation[0])
const activeGroupTitle = computed(() => ({ service: '产业服务', ai: 'AI 能力资源', ecosystem: '创新生态', workspace: '角色工作台' })[groupKey.value])
const visibleItems = computed(() => activeGroup.value.items.filter(item => groupKey.value !== 'workspace' || item.path.includes(`/${store.user?.role}/`)))
const pageKey = computed(() => {
  const path = localPath.value
  if (/^\/detail\/(catalog|supplier)\/\d+$/.test(path)) return 'catalogDetail'
  if (/^\/enterprise\/applications\/\d+$/.test(path)) return 'myApplications'
  if (/^\/operations\/applications\/\d+$/.test(path)) return 'operations'
  if (/^\/government\/projects\/\d+$/.test(path)) return 'projects'
  if (path === '/services/demands/new') return 'demandForm'
  if (path.endsWith('/matches')) return 'matches'
  if (/^\/services\/demands\/[^/]+$/.test(path)) return 'demandDetail'
  return {
    '/enterprise/workbench': 'enterprise', '/services/demands': 'demands', '/ai/resources': 'resources',
    '/services/pilot': 'pilot', '/ecosystem/events': 'events', '/ecosystem/tasks': 'tasks',
    '/services/qualification': 'qualification', '/ecosystem/alliance': 'alliance',
    '/enterprise/applications': 'myApplications', '/operations/applications': 'operations',
    '/government/overview': 'government', '/government/projects': 'projects'
  }[path] || 'enterprise'
})
const pageTitle = computed(() => ({ enterprise: '企业工作台', demands: '供需大厅', demandForm: '发布需求', demandDetail: '需求详情', catalogDetail: '资源详情', matches: '智能匹配', resources: 'AI 服务中心', pilot: '中试验证中心', events: '赛事活动', tasks: '揭榜挂帅', qualification: '资质与评测', alliance: '产业联盟', myApplications: '我的办理', operations: '运营受理台', government: '政府总览', projects: '项目台账' })[pageKey.value])
const roleLabel = computed(() => ({ enterprise: '企业视角', operations: '运营视角', government: '政府视角' })[store.user?.role] || '登录工作台')

onMounted(() => store.init())
watch([localPath, () => store.ready, () => store.user], ([path, ready, user]) => {
  if (!ready || isPublic.value) return
  const needed = path.startsWith('/enterprise/') ? 'enterprise' : path.startsWith('/operations/') ? 'operations' : path.startsWith('/government/') ? 'government' : null
  if (!user && (needed || path === '/services/demands/new' || path.endsWith('/matches'))) return router.replace(`${basePath}/login?redirect=${encodeURIComponent(route.fullPath)}`)
  if (!user) return
  if (needed && user.role !== needed) router.replace(`${basePath}${roleHome[user.role]}`)
}, { immediate: true })

const go = path => router.push(`${basePath}${path}`)
const goAbsolute = path => router.push(path)
const goGroup = group => group.key === 'workspace' ? go(store.user ? roleHome[store.user.role] : '/login') : goAbsolute(group.path)
const drawerItems = group => group.key === 'workspace' ? group.items.filter(item => item.path.includes(`/${store.user?.role}/`)) : group.items
const isItemActive = path => route.path === path || (['/demands', '/applications', '/projects'].some(suffix => path.endsWith(suffix)) && route.path.startsWith(`${path}/`))
const onAccountCommand = async command => { await store.logout(); go(command === 'switch' ? '/login' : '') }
</script>
