<template>
  <div class="public-preview">
    <template v-if="page === 'home'">
      <section class="portal-hero">
        <div class="portal-hero__shade"></div>
        <div class="portal-hero__content">
          <span class="portal-hero__label">JI'AN · AI INNOVATION</span>
          <h1>吉安市人工智能创新应用<br />综合服务平台</h1>
          <p>赣 AI 融智引擎 · 智领吉安未来</p>
          <span class="portal-hero__operator">吉安新庐陵智城数据运营管理有限公司</span>
          <div class="portal-hero__actions"><el-button type="primary" size="large" :icon="Position" @click="navigate('/services/demands/new')">发布需求</el-button><el-button size="large" :icon="Search" @click="navigate('/search')">探索资源</el-button></div>
        </div>
        <div class="portal-hero__caption">吉安城市航拍 · 吉安 AI 创新应用</div>
      </section>
      <div class="public-content">
        <div class="portal-metrics"><div v-for="item in portal.metrics" :key="item.metric_key" class="portal-metric"><span>{{ item.label }}</span><strong>{{ formatValue(item.value) }}<small>{{ item.unit }}</small></strong><p>{{ item.note }}</p></div><el-skeleton v-if="loading" :rows="2" animated /><span class="data-stamp">演示数据</span></div>
        <section class="portal-section"><div class="section-heading"><div><span class="eyebrow">SERVICE ENTRANCE</span><h2>我要办</h2></div><button class="text-link" @click="navigate(homePath)">进入工作台 <el-icon><ArrowRight /></el-icon></button></div><div class="portal-action-grid"><button v-for="item in serviceActions" :key="item.label" class="portal-action" @click="navigate(item.path)"><span class="portal-action__icon"><el-icon :size="24"><component :is="item.icon" /></el-icon></span><span><strong>{{ item.label }}</strong><small>{{ item.note }}</small></span><el-icon><ArrowRight /></el-icon></button></div></section>
        <section class="portal-section portal-section--search"><div><span class="eyebrow">RESOURCE DISCOVERY</span><h2>我要查</h2><p>快速定位场景需求、模型、数据集与政策资讯。</p></div><div class="portal-search"><el-input v-model="homeKeyword" :prefix-icon="Search" size="large" placeholder="搜索场景、模型、数据集或政策" @keyup.enter="goSearch" /><el-button type="primary" size="large" @click="goSearch">搜索</el-button></div><div class="portal-quick-links"><button v-for="item in quickSearch" :key="item.label" @click="navigate(`/search?type=${item.type}`)">{{ item.label }} <el-icon><ArrowRight /></el-icon></button></div></section>
        <section class="portal-section"><div class="section-heading"><div><span class="eyebrow">OPEN SCENARIOS</span><h2>重点应用场景</h2></div><button class="text-link" @click="navigate('/services/demands')">查看需求 <el-icon><ArrowRight /></el-icon></button></div><div class="scenario-list"><button v-for="item in portal.demands" :key="item.id" @click="navigate(`/services/demands/${item.id}`)"><span>{{ item.industry }}</span><strong>{{ item.title }}</strong><small>{{ item.region }} · {{ budgetText(item) }}</small><el-icon><TopRight /></el-icon></button></div><el-empty v-if="!portal.demands.length && !loading" description="暂无开放场景" /></section>
        <section class="portal-section portal-section--news"><div class="section-heading"><div><span class="eyebrow">LATEST NEWS</span><h2>政策资讯与平台动态</h2></div></div><div class="news-lines"><button v-for="item in portal.news" :key="item.id" @click="navigate(`/search?q=${encodeURIComponent(item.title)}`)"><span>{{ item.subtype }}</span><strong>{{ item.title }}</strong><time>{{ dateText(item.created_at) }}</time></button></div><el-empty v-if="!portal.news.length && !loading" description="暂无最新资讯" /></section>
        <el-alert v-if="loadError" :title="loadError" type="error" show-icon><template #default><el-button text @click="loadPortal">重试</el-button></template></el-alert>
      </div>
      <footer class="portal-footer"><strong>吉安市人工智能创新应用综合服务平台</strong><span>吉安新庐陵智城数据运营管理有限公司</span><small>平台指标为演示数据</small></footer>
    </template>

    <template v-else-if="page === 'search'">
      <div class="public-content search-page">
        <div class="page-intro"><span class="eyebrow">PLATFORM SEARCH</span><h1>综合检索</h1><p>从场景需求到 AI 资源，在同一入口快速查找。</p></div>
        <div class="search-console"><el-input v-model="keyword" :prefix-icon="Search" size="large" placeholder="搜索需求、模型、数据或政策" clearable @keyup.enter="runSearch" /><el-button type="primary" :icon="Search" @click="runSearch">搜索</el-button></div>
        <div class="segmented-row"><el-segmented v-model="searchType" :options="searchTypes" @change="runSearch" /></div>
        <div class="search-results"><div class="search-results__count">共 {{ searchResults.length }} 条结果 <span>含演示数据</span></div><button v-for="item in searchResults" :key="`${item.category}-${item.id}`" class="search-result" @click="openResult(item)"><span class="search-result__icon"><el-icon :size="22"><component :is="categoryIcon(item.category)" /></el-icon></span><span><small>{{ categoryLabel(item.category) }}</small><strong>{{ item.title }}</strong><em>{{ item.summary }}</em></span><el-icon><ArrowRight /></el-icon></button><el-empty v-if="!searchResults.length && !searchLoading && !searchError" description="未找到相关内容" /><el-skeleton v-if="searchLoading" :rows="4" animated /><el-alert v-if="searchError" :title="searchError" type="error" show-icon /></div>
      </div>
      <el-drawer v-model="detailOpen" :title="selectedResult?.title || '内容详情'" size="480px"><div v-if="selectedResult" class="drawer-summary"><el-tag size="small">{{ categoryLabel(selectedResult.category) }}</el-tag><h2>{{ selectedResult.title }}</h2><p>{{ selectedResult.body || selectedResult.summary || selectedResult.description }}</p><div class="drawer-fields"><div><span>来源</span><strong>{{ selectedResult.provider || '平台演示资料' }}</strong></div><div><span>状态</span><strong>{{ selectedResult.status || '公开' }}</strong></div></div></div><template #footer><el-button @click="navigate(`/detail/${selectedResult?.category === 'supplier' ? 'supplier' : 'catalog'}/${selectedResult.id}`)">独立详情</el-button></template></el-drawer>
    </template>

    <template v-else>
      <div class="login-preview"><div class="login-preview__visual"><span class="eyebrow">JI'AN AI</span><h1>链接产业需求<br />释放人工智能价值</h1><p>吉安市人工智能创新应用综合服务平台</p><span class="login-preview__credit">吉安新庐陵智城数据运营管理有限公司</span></div><div class="login-preview__form"><span class="eyebrow">WORKSPACE ACCESS</span><h2>登录工作台</h2><p>选择演示身份，进入对应的业务工作区。</p><div class="role-choice"><button v-for="item in roleOptions" :key="item.value" :class="{ active: selectedRole === item.value }" @click="selectRole(item.value)"><el-icon :size="22"><component :is="item.icon" /></el-icon><strong>{{ item.label }}</strong><small>{{ item.note }}</small></button></div><el-form @submit.prevent="submitLogin" label-position="top"><el-form-item label="用户名"><el-input v-model="username" autocomplete="username" placeholder="演示账号" /></el-form-item><el-form-item label="密码"><el-input v-model="password" type="password" autocomplete="current-password" show-password placeholder="请输入密码" @keyup.enter="submitLogin" /></el-form-item><el-button class="login-preview__submit" type="primary" size="large" :loading="loginLoading" @click="submitLogin">进入工作台</el-button></el-form><button class="text-link login-preview__back" @click="navigate('')"><el-icon><ArrowLeft /></el-icon> 返回平台首页</button><span class="login-preview__note">演示账号仅用于本地演示环境</span></div></div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, ArrowRight, Position, Search, TopRight } from '@element-plus/icons-vue'
import { aiApi } from '@/api/aiDemo'
import { useAiDemoStore } from '@/store/aiDemo'

const props = defineProps({ page: { type: String, required: true } })
const emit = defineEmits(['navigate'])
const route = useRoute()
const router = useRouter()
const store = useAiDemoStore()
const navigate = path => emit('navigate', path)
const roleHome = { enterprise: '/enterprise/workbench', operations: '/operations/applications', government: '/government/overview' }
const homePath = computed(() => store.user ? roleHome[store.user.role] : '/login')
const serviceActions = [
  { label: '发布场景需求', icon: 'EditPen', path: '/services/demands/new', note: '让技术供给找到真实场景' },
  { label: '申请算力资源', icon: 'Cpu', path: '/ai/resources', note: '按需选用多种算力规格' },
  { label: '申请中试验证', icon: 'SetUp', path: '/services/pilot', note: '验证模型与场景适配效果' },
  { label: '查看揭榜任务', icon: 'Trophy', path: '/ecosystem/tasks', note: '参与关键技术攻关' },
  { label: '企业资质认定', icon: 'Stamp', path: '/services/qualification', note: '在线了解申报条件' },
  { label: '加入产业联盟', icon: 'UserFilled', path: '/ecosystem/alliance', note: '链接本地产业生态' }
]
const quickSearch = [{ label:'需求场景', type:'demand' }, { label:'模型资源', type:'model' }, { label:'行业数据', type:'data' }, { label:'政策资讯', type:'policy' }]
const portal = reactive({ metrics: [], demands: [], news: [] })
const loading = ref(false)
const loadError = ref('')
async function loadPortal() {
  loading.value = true; loadError.value = ''
  try { Object.assign(portal, await aiApi.portal()) } catch (error) { loadError.value = error.message } finally { loading.value = false }
}
const homeKeyword = ref('')
const goSearch = () => navigate(`/search${homeKeyword.value.trim() ? `?q=${encodeURIComponent(homeKeyword.value.trim())}` : ''}`)
const keyword = ref('')
const searchType = ref('全部')
const searchTypes = ['全部', '需求场景', '供给方案', '模型资源', '数据集', '政策资讯', '办理进度']
const typeMap = { 全部: '', 需求场景: 'demand', 供给方案: 'supplier', 模型资源: 'model', 数据集: 'data', 政策资讯: 'policy', 办理进度: 'application' }
const searchResults = ref([])
const searchLoading = ref(false)
const searchError = ref('')
async function runSearch() {
  searchLoading.value = true; searchError.value = ''
  try { searchResults.value = (await aiApi.search({ q: keyword.value, type: typeMap[searchType.value] })).items } catch (error) { searchError.value = error.message } finally { searchLoading.value = false }
}
watch(() => [props.page, route.query.q, route.query.type], ([page, q, type]) => {
  if (page === 'home') loadPortal()
  if (page === 'search') { keyword.value = typeof q === 'string' ? q : ''; searchType.value = Object.keys(typeMap).find(key => typeMap[key] === type) || '全部'; runSearch() }
}, { immediate: true })
const detailOpen = ref(false)
const selectedResult = ref(null)
async function openResult(item) {
  if (item.category === 'demand') return navigate(`/services/demands/${item.id}`)
  if (item.category === 'application') return navigate(`/enterprise/applications/${item.id}`)
  try { selectedResult.value = item.category === 'supplier' ? { ...(await aiApi.supplierDetail(item.id)), category: 'supplier' } : await aiApi.catalogDetail(item.id); detailOpen.value = true } catch (error) { ElMessage.error(error.message) }
}
const categoryLabel = category => ({ demand: '需求场景', supplier: '供给方案', application: '办理进度', model: '模型资源', data: '数据集', compute: '算力资源', agent: '智能体', policy: '政策资讯', news: '平台动态', event: '赛事活动', task: '揭榜任务' })[category] || '平台资源'
const categoryIcon = category => ({ demand: 'Connection', model: 'MagicStick', data: 'Files', policy: 'Document', news: 'Document' })[category] || 'Cpu'
const formatValue = value => Number(value) % 1 ? Number(value) : Number(value).toFixed(0)
const budgetText = item => item.budget_min == null ? '预算面议' : `${Number(item.budget_min)}-${Number(item.budget_max)} 万元`
const dateText = value => String(value || '').slice(0, 10)

const roleOptions = [
  { value: 'enterprise', label: '企业', note: '发布需求 · 申请服务', icon: 'OfficeBuilding', username: 'ai_enterprise' },
  { value: 'operations', label: '运营', note: '受理申请 · 跟踪进度', icon: 'Service', username: 'ai_operations' },
  { value: 'government', label: '政府', note: '产业监测 · 项目台账', icon: 'DataAnalysis', username: 'ai_government' }
]
const selectedRole = ref('enterprise')
const username = ref('ai_enterprise')
const password = ref('')
const loginLoading = ref(false)
const selectRole = role => { selectedRole.value = role; username.value = roleOptions.find(item => item.value === role).username; password.value = '' }
async function submitLogin() {
  if (!username.value || !password.value) return ElMessage.warning('请填写用户名和密码')
  loginLoading.value = true
  try {
    if (store.user) await store.logout()
    const user = await store.login(username.value, password.value)
    ElMessage.success('登录成功')
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/ai-demo/') ? route.query.redirect : `/ai-demo${roleHome[user.role]}`
    await router.replace(redirect)
  } catch (error) { ElMessage.error(error.message) } finally { loginLoading.value = false }
}
onMounted(() => { if (props.page === 'login' && store.user) selectRole(store.user.role) })
</script>
