<template>
  <div class="dashboard-container page-shell">
    <!-- 顶部欢迎区域 -->
    <div class="welcome-section page-shell__section">
      <div class="welcome-content">
        <div class="greeting">
          <h2 class="greeting-text">{{ greeting }}，{{ userInfo.nickName || '管理员' }}</h2>
          <p class="greeting-desc">系统运行正常，各项指标健康</p>
        </div>
        <div class="date-info">
          <span class="date">
            <el-icon><Calendar /></el-icon>
            {{ currentDate }}
          </span>
        </div>
      </div>
    </div>

    <!-- 系统监控卡片 -->
    <div class="stats-section page-shell__section">
      <div class="stat-card" v-for="item in systemStats" :key="item.title">
        <div class="stat-main">
          <div class="stat-value">
            <span class="value">{{ item.value }}</span>
            <span class="unit">{{ item.unit }}</span>
          </div>
          <div class="stat-title">{{ item.title }}</div>
          <div class="stat-trend" :class="item.trendType">
            <span>{{ item.trendLabel }}</span>
          </div>
        </div>
        <div class="stat-icon" :class="'stat-icon--' + item.colorType">
          <el-icon :size="32"><component :is="item.icon" /></el-icon>
        </div>
        <!-- 进度条 -->
        <div v-if="item.progress !== undefined" class="stat-progress">
          <el-progress
            :percentage="item.progress"
            :stroke-width="6"
            :show-text="false"
            :color="item.progressColor"
          />
        </div>
      </div>
    </div>

    <!-- 基础数据统计 -->
    <div class="stats-section page-shell__section">
      <div class="stat-card" v-for="item in dataStats" :key="item.title">
        <div class="stat-main">
          <div class="stat-value">
            <span class="value">{{ item.value }}</span>
            <span class="unit">{{ item.unit }}</span>
          </div>
          <div class="stat-title">{{ item.title }}</div>
          <div class="stat-trend" :class="item.trendType">
            <span>{{ item.trendLabel }}</span>
          </div>
        </div>
        <div class="stat-icon" :class="'stat-icon--' + item.colorType">
          <el-icon :size="32"><component :is="item.icon" /></el-icon>
        </div>
      </div>
    </div>

    <!-- 最近登录记录 -->
    <el-row :gutter="20" class="bottom-section page-grid page-shell__section">
      <el-col :xs="24" :lg="14">
        <div class="card">
          <div class="card-header">
            <span class="card-title">
              <el-icon><Clock /></el-icon>
              最近登录记录
            </span>
          </div>
          <div class="login-list">
            <div class="login-item" v-for="(item, index) in loginRecords" :key="index">
              <div class="login-avatar">
                <el-avatar :size="40">{{ item.username.charAt(0).toUpperCase() }}</el-avatar>
              </div>
              <div class="login-info">
                <div class="login-user">{{ item.username }}</div>
                <div class="login-time">{{ item.loginTime }}</div>
              </div>
              <div class="login-ip">{{ item.ip }}</div>
            </div>
          </div>
        </div>
      </el-col>

      <!-- 快捷入口 -->
      <el-col :xs="24" :lg="10">
        <div class="card">
          <div class="card-header">
            <span class="card-title">
              <el-icon><Grid /></el-icon>
              快捷入口
            </span>
          </div>
          <div class="quick-actions">
            <div class="action-item" v-for="action in quickActions" :key="action.name" @click="handleQuickAction(action.path)">
              <div class="action-icon" :style="{ background: action.color }">
                <el-icon :size="24"><component :is="action.icon" /></el-icon>
              </div>
              <span class="action-name">{{ action.name }}</span>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { getDashboardStats, getSystemStats, getLoginRecords } from '@/api/dashboard'
import {
  Calendar, Clock, Grid,
  User, Document, Coin, CircleCheck,
  Cpu, Monitor, FolderOpened, Connection,
  Setting, Menu, UserFilled
} from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()
const userInfo = computed(() => userStore.userInfo)

// 问候语
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '凌晨好'
  if (hour < 9) return '早上好'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 17) return '下午好'
  if (hour < 19) return '傍晚好'
  return '晚上好'
})

// 当前日期
const currentDate = computed(() => {
  const now = new Date()
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${now.getMonth() + 1}月${now.getDate()}日 ${weekdays[now.getDay()]} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`
})

// 系统监控数据
const systemStats = ref([
  {
    title: 'CPU 使用率',
    value: '-',
    unit: '%',
    trendType: 'normal',
    trendLabel: '运行正常',
    icon: 'Cpu',
    colorType: 'primary',
    progress: 0,
    progressColor: 'linear-gradient(90deg, var(--primary-color), var(--primary-light))'
  },
  {
    title: '内存使用率',
    value: '-',
    unit: '%',
    trendType: 'normal',
    trendLabel: '运行正常',
    icon: 'Monitor',
    colorType: 'success',
    progress: 0,
    progressColor: 'linear-gradient(90deg, #67c23a, #95d475)'
  },
  {
    title: '磁盘使用率',
    value: '-',
    unit: '%',
    trendType: 'normal',
    trendLabel: '空间充足',
    icon: 'FolderOpened',
    colorType: 'warning',
    progress: 0,
    progressColor: 'linear-gradient(90deg, #e6a23c, #f3c57a)'
  },
  {
    title: '在线用户',
    value: '-',
    unit: '人',
    trendType: 'normal',
    trendLabel: '实时统计',
    icon: 'Connection',
    colorType: 'danger'
  }
])

// 基础数据统计
const dataStats = ref([
  {
    title: '系统用户',
    value: '-',
    unit: '人',
    trendType: 'normal',
    trendLabel: '总用户数',
    icon: 'User',
    colorType: 'primary'
  },
  {
    title: '系统菜单',
    value: '-',
    unit: '个',
    trendType: 'normal',
    trendLabel: '已配置',
    icon: 'Document',
    colorType: 'success'
  },
  {
    title: '角色数量',
    value: '-',
    unit: '个',
    trendType: 'normal',
    trendLabel: '权限体系',
    icon: 'Coin',
    colorType: 'warning'
  },
  {
    title: '今日登录',
    value: '-',
    unit: '次',
    trendType: 'normal',
    trendLabel: '活跃度',
    icon: 'CircleCheck',
    colorType: 'danger'
  }
])

// 最近登录记录
const loginRecords = ref([])

// 快捷入口
const quickActions = [
  { name: '用户管理', icon: 'UserFilled', path: '/system/user', color: 'linear-gradient(135deg, var(--primary-color), var(--primary-light))' },
  { name: '角色管理', icon: 'User', path: '/system/role', color: 'linear-gradient(135deg, #67c23a, #95d475)' },
  { name: '菜单管理', icon: 'Menu', path: '/system/menu', color: 'linear-gradient(135deg, #e6a23c, #f3c57a)' },
  { name: '系统设置', icon: 'Setting', path: '/system/settings', color: 'linear-gradient(135deg, #f56c6c, #f89898)' }
]

// 加载基础数据统计
const loadDataStats = async () => {
  try {
    const res = await getDashboardStats()
    if (res.code === 200) {
      const { userCount, menuCount, roleCount, todayLoginCount } = res.data
      dataStats.value[0].value = String(userCount)
      dataStats.value[1].value = String(menuCount)
      dataStats.value[2].value = String(roleCount)
      dataStats.value[3].value = String(todayLoginCount || 0)
    }
  } catch (e) {
    console.error('加载基础数据统计失败', e)
  }
}

// 加载系统监控数据
const loadSystemStats = async () => {
  try {
    const res = await getSystemStats()
    if (res.code === 200) {
      const { cpu, memory, disk, onlineUsers } = res.data
      systemStats.value[0].value = String(cpu)
      systemStats.value[0].progress = cpu
      systemStats.value[0].trendLabel = cpu > 80 ? '负载较高' : '运行正常'
      systemStats.value[0].trendType = cpu > 80 ? 'warning' : 'normal'

      systemStats.value[1].value = String(memory)
      systemStats.value[1].progress = memory
      systemStats.value[1].trendLabel = memory > 80 ? '内存紧张' : '运行正常'
      systemStats.value[1].trendType = memory > 80 ? 'warning' : 'normal'

      systemStats.value[2].value = String(disk)
      systemStats.value[2].progress = disk
      systemStats.value[2].trendLabel = disk > 80 ? '空间不足' : '空间充足'
      systemStats.value[2].trendType = disk > 80 ? 'warning' : 'normal'

      systemStats.value[3].value = String(onlineUsers)
    }
  } catch (e) {
    console.error('加载系统监控数据失败', e)
  }
}

// 加载登录记录
const loadLoginRecords = async () => {
  try {
    const res = await getLoginRecords()
    if (res.code === 200) {
      loginRecords.value = res.data
    }
  } catch (e) {
    console.error('加载登录记录失败', e)
  }
}

// 快捷入口点击
const handleQuickAction = (path) => {
  if (path) {
    router.push(path)
  }
}

// 定时刷新系统监控数据
let refreshTimer = null
const startRefresh = () => {
  refreshTimer = setInterval(() => {
    loadSystemStats()
  }, 30000) // 每30秒刷新一次
}

onMounted(() => {
  loadDataStats()
  loadSystemStats()
  loadLoginRecords()
  startRefresh()
})

onBeforeUnmount(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>

<style lang="scss" scoped>
.dashboard-container {
  padding: 0;
}

// 欢迎区域
.welcome-section {
  background: linear-gradient(135deg, var(--primary-bg-light) 0%, var(--primary-bg-lighter) 100%);
  border-radius: 12px;
  padding: 24px 28px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .welcome-content {
    .greeting-text {
      font-size: 22px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 8px 0;
    }

    .greeting-desc {
      font-size: 14px;
      color: var(--text-regular);
      margin: 0 0 12px 0;
    }

    .date-info {
      display: flex;
      gap: 20px;
      font-size: 13px;
      color: var(--text-secondary);

      span {
        display: flex;
        align-items: center;
        gap: 4px;
      }
    }
  }
}

// 统计卡片
.stats-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 20px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }

  .stat-card {
    background: var(--bg-card);
    border-radius: 12px;
    padding: 24px;
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border-lighter);
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    min-height: 120px;

    .stat-main {
      .stat-value {
        margin-bottom: 8px;

        .value {
          font-size: 32px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -1px;
        }

        .unit {
          font-size: 14px;
          color: var(--text-secondary);
          margin-left: 4px;
        }
      }

      .stat-title {
        font-size: 14px;
        color: var(--text-secondary);
        margin-bottom: 8px;
      }

      .stat-trend {
        font-size: 12px;
        color: var(--text-secondary);

        &.warning {
          color: #e6a23c;
        }
      }
    }

    .stat-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--el-color-primary);

      &--primary {
        background: linear-gradient(135deg, rgba(var(--primary-color-rgb), 0.1), rgba(var(--primary-color-rgb), 0.05));
      }
      &--success {
        background: linear-gradient(135deg, rgba(103, 194, 58, 0.1), rgba(103, 194, 58, 0.05));
        color: #67c23a;
      }
      &--warning {
        background: linear-gradient(135deg, rgba(230, 162, 60, 0.1), rgba(230, 162, 60, 0.05));
        color: #e6a23c;
      }
      &--danger {
        background: linear-gradient(135deg, rgba(245, 108, 108, 0.1), rgba(245, 108, 108, 0.05));
        color: #f56c6c;
      }
    }

    .stat-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 0 24px 12px;

      :deep(.el-progress-bar__outer) {
        background: var(--border-lighter);
      }
    }
  }
}

// 底部区域
.bottom-section {
  .card {
    background: var(--bg-card);
    border-radius: 12px;
    padding: 20px;
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border-lighter);
    height: 100%;

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;

      .card-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary);
      }
    }
  }

  // 登录记录
  .login-list {
    .login-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid var(--border-lighter);

      &:last-child {
        border-bottom: none;
      }

      .login-avatar {
        flex-shrink: 0;
      }

      .login-info {
        flex: 1;

        .login-user {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .login-time {
          font-size: 12px;
          color: var(--text-secondary);
        }
      }

      .login-ip {
        font-size: 12px;
        color: var(--text-secondary);
      }
    }
  }

  // 快捷操作
  .quick-actions {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;

    .action-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 16px;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background: var(--bg-hover);
        transform: translateY(-2px);
      }

      .action-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
      }

      .action-name {
        font-size: 13px;
        color: var(--text-regular);
      }
    }
  }
}
</style>
