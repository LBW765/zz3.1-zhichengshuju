<template>
  <div class="login-container">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="circle circle-1"></div>
      <div class="circle circle-2"></div>
      <div class="circle circle-3"></div>
    </div>

    <!-- 登录卡片 -->
    <div class="login-card">
      <div class="login-header">
        <div class="logo" :class="{ 'has-image': platformConfig.logo }">
          <img v-if="platformConfig.logo" :src="platformConfig.logo" alt="Logo">
          <el-icon v-else :size="28"><Platform /></el-icon>
        </div>
        <h1 class="title">{{ platformConfig.fullName || '信息化管理系统' }}</h1>
        <p v-if="platformConfig.loginSubtitle" class="subtitle">{{ platformConfig.loginSubtitle }}</p>
      </div>

      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        class="login-form"
      >
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="请输入用户名"
            size="large"
            :prefix-icon="User"
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            :prefix-icon="Lock"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <div class="login-options">
          <el-checkbox v-model="loginForm.rememberMe">记住用户名</el-checkbox>
        </div>

        <el-button
          :loading="loading"
          size="large"
          type="primary"
          class="login-btn"
          @click="handleLogin"
        >
          <span v-if="!loading">登 录</span>
          <span v-else>登 录 中...</span>
        </el-button>
      </el-form>
    </div>

    <!-- 底部版权信息 -->
    <div class="login-footer">
      <span>{{ footerText }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { useAppStore } from '@/store/app'
import { ElMessage } from 'element-plus'
import { User, Lock, Platform } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const appStore = useAppStore()

const loginFormRef = ref()
const loading = ref(false)
const platformConfig = computed(() => appStore.platformConfig)

// 底部文字
const footerText = computed(() => {
  return `${platformConfig.value.fullName || '信息化管理系统'} © ${platformConfig.value.copyrightYear || '2026'} ${platformConfig.value.companyName || ''}`.trim()
})

// 记住用户名：从 localStorage 读取
const rememberedUsername = localStorage.getItem('remembered-username') || ''

const loginForm = reactive({
  username: rememberedUsername,
  password: '',
  rememberMe: !!rememberedUsername
})

const loginRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ]
}

const isInternalPath = (path) => typeof path === 'string' && path.startsWith('/') && !path.startsWith('//')

const getDefaultHomePath = () => {
  return '/'
}

const handleLogin = () => {
  loginFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        await userStore.userLogin(loginForm)
        await userStore.getInfo()

        // 记住用户名
        if (loginForm.rememberMe) {
          localStorage.setItem('remembered-username', loginForm.username)
        } else {
          localStorage.removeItem('remembered-username')
        }

        ElMessage.success('登录成功')

        const redirect = route.query.redirect
        const targetPath = isInternalPath(redirect) ? redirect : getDefaultHomePath()
        router.push(targetPath)
      } catch (error) {
        // 错误提示已在 request.js 响应拦截器中处理，此处不重复弹出
      } finally {
        loading.value = false
      }
    }
  })
}

onMounted(() => {
  appStore.fetchPlatformConfig()
})
</script>

<style lang="scss" scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-color, #f5f7fa);
  position: relative;
  overflow: hidden;
}

// 背景装饰圆形
.bg-decoration {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
}

.circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.5;

  &.circle-1 {
    width: 350px;
    height: 350px;
    background: linear-gradient(135deg, rgba(78, 205, 196, 0.25), rgba(78, 205, 196, 0.08));
    top: -80px;
    right: -80px;
  }

  &.circle-2 {
    width: 280px;
    height: 280px;
    background: linear-gradient(135deg, rgba(255, 107, 107, 0.18), rgba(255, 107, 107, 0.05));
    bottom: -60px;
    left: -60px;
  }

  &.circle-3 {
    width: 180px;
    height: 180px;
    background: linear-gradient(135deg, rgba(255, 230, 109, 0.25), rgba(255, 230, 109, 0.08));
    top: 45%;
    left: 8%;
  }
}

// 登录卡片
.login-card {
  width: 380px;
  padding: 36px;
  background: var(--bg-card, #ffffff);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid var(--border-color, #ebeef5);
  z-index: 1;
}

.login-header {
  text-align: center;
  margin-bottom: 28px;
}

.logo {
  width: 56px;
  height: 56px;
  margin: 0 auto 14px;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(var(--primary-color-rgb), 0.3);
  color: #fff;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 14px;
  }

  // 有 Logo 图片时的样式
  &.has-image {
    background: #fff;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
    padding: 8px;

    img {
      object-fit: contain;
    }
  }
}

.title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary, #303133);
  margin-bottom: 6px;
}

.subtitle {
  font-size: 13px;
  color: var(--text-secondary, #909399);
}

// 表单样式
.login-form {
  :deep(.el-form-item) {
    margin-bottom: 18px;
  }

  :deep(.el-input__wrapper) {
    height: 42px;
    border-radius: 8px;
    background: var(--bg-color, #f5f7fa);
    box-shadow: 0 0 0 1px var(--border-color, #dcdfe6) inset;

    &:hover {
      box-shadow: 0 0 0 1px var(--border-color) inset;
    }

    &.is-focus {
      box-shadow: 0 0 0 1px var(--el-color-primary) inset;
    }
  }

  :deep(.el-input__inner) {
    color: var(--text-primary, #303133);

    &::placeholder {
      color: var(--text-light, #c0c4cc);
    }
  }

  :deep(.el-input__prefix) {
    color: var(--text-light, #c0c4cc);
  }
}

.login-options {
  margin-bottom: 12px;

  :deep(.el-checkbox__label) {
    color: var(--text-secondary, #909399);
    font-size: 13px;
  }
}

.login-btn {
  width: 100%;
  height: 42px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
  border: none;

  &:hover {
    background: linear-gradient(135deg, var(--primary-light), var(--primary-color));
  }
}

// 底部版权信息
.login-footer {
  position: absolute;
  bottom: 20px;
  font-size: 12px;
  color: var(--text-light, #c0c4cc);
}

// 响应式
@media (max-width: 480px) {
  .login-card {
    width: calc(100% - 40px);
    padding: 28px 20px;
    margin: 0 20px;
  }
}

// 暗黑模式适配（使用 data-theme 属性）
:global([data-theme="dark"]) {
  .login-container {
    background: var(--bg-color);
  }

  .login-card {
    background: var(--bg-card);
    border-color: var(--border-color);
  }

  .logo {
    box-shadow: 0 4px 12px rgba(var(--primary-color-rgb), 0.5);
  }

  .circle {
    &.circle-1 {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(102, 126, 234, 0.05));
    }

    &.circle-2 {
      background: linear-gradient(135deg, rgba(118, 75, 162, 0.15), rgba(118, 75, 162, 0.05));
    }

    &.circle-3 {
      background: linear-gradient(135deg, rgba(0, 217, 255, 0.12), rgba(0, 217, 255, 0.04));
    }
  }

  .login-form {
    :deep(.el-input__wrapper) {
      background: var(--bg-color);
      box-shadow: 0 0 0 1px var(--border-color) inset;
    }
  }
}
</style>
