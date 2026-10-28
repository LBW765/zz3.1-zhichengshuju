<template>
  <view class="app-page login-page">
    <AppStatusBar background="transparent" />

    <view class="login-page__hero">
      <view class="login-page__badge">APP TEMPLATE</view>
      <view class="login-page__title">{{ platformConfig.fullName }}</view>
      <view class="login-page__subtitle">{{ platformConfig.loginSubtitle }}</view>
    </view>

    <view class="login-page__body">
      <AppCard customClass="login-card">
        <view class="login-card__title">欢迎登录</view>
        <view class="login-card__desc">先完成帐号密码登录，后续可扩展手机验证码与微信授权。</view>

        <view class="login-form">
          <view class="login-field">
            <text class="login-field__label">用户名</text>
            <input v-model="form.username" class="login-field__input" placeholder="请输入用户名" />
          </view>
          <view class="login-field">
            <text class="login-field__label">密码</text>
            <input v-model="form.password" class="login-field__input" password placeholder="请输入密码" />
          </view>
        </view>

        <view
          class="app-primary-btn"
          :class="{ 'is-loading': loading }"
          @click="handleLogin"
        >{{ loading ? '登录中...' : '登 录' }}</view>

        <view class="login-card__extra">
          <view class="login-card__extra-item is-disabled">手机验证码登录（预留）</view>
          <view class="login-card__extra-item is-disabled">微信授权登录（预留）</view>
        </view>
      </AppCard>
    </view>
  </view>
</template>

<script setup>
import { reactive, ref } from 'vue'
import AppCard from '@/components/app-card/index.vue'
import AppStatusBar from '@/components/app-status-bar/index.vue'
import { useUserStore } from '@/store/user'
import { useAppStore } from '@/store/app'

const userStore = useUserStore()
const appStore = useAppStore()
const platformConfig = appStore.platformConfig
const loading = ref(false)

const form = reactive({
  username: 'admin',
  password: 'admin123'
})

const handleLogin = async () => {
  if (!form.username || !form.password) {
    uni.showToast({ title: '请输入用户名和密码', icon: 'none' })
    return
  }

  if (loading.value) {
    return
  }

  loading.value = true
  try {
    await userStore.userLogin(form)
    await userStore.fetchUserInfo()
    // 先跳转再清 loading，避免在已销毁组件上触发响应式更新引发 uni-app H5 slot 只读错误
    uni.switchTab({ url: '/pages/home/index' })
  } catch {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.login-page {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at top right, rgba(var(--primary-color-rgb), 0.18), transparent 30%),
    radial-gradient(circle at left center, rgba(var(--primary-color-rgb), 0.08), transparent 24%),
    $bg-color;
}

.login-page__hero {
  padding: 48rpx $space-lg 0;
}

.login-page__badge {
  display: inline-flex;
  align-items: center;
  height: 48rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  background: rgba($primary-color, 0.12);
  color: $primary-color;
  font-size: 22rpx;
  font-weight: 700;
}

.login-page__title {
  margin-top: 28rpx;
  font-size: 56rpx;
  font-weight: 700;
  color: $text-primary;
}

.login-page__subtitle {
  margin-top: 16rpx;
  font-size: 26rpx;
  color: $text-secondary;
}

.login-page__body {
  padding: 48rpx $space-lg $space-xl;
}

:deep(.login-card) {
  padding: 40rpx 32rpx;
}

.login-card__title {
  font-size: 40rpx;
  font-weight: 700;
  color: $text-primary;
}

.login-card__desc {
  margin-top: 12rpx;
  margin-bottom: 32rpx;
  font-size: 24rpx;
  color: $text-secondary;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  margin-bottom: 32rpx;
}

.login-field__label {
  display: block;
  margin-bottom: 12rpx;
  font-size: 24rpx;
  color: $text-secondary;
}

.login-field__input {
  width: 100%;
  height: 96rpx;
  padding: 0 28rpx;
  border-radius: 24rpx;
  background: $bg-muted;
  color: $text-primary;
  font-size: 28rpx;
}

.login-card__extra {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
  margin-top: 24rpx;
}

.login-card__extra-item {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 84rpx;
  border-radius: 24rpx;
  font-size: 24rpx;
  background: $bg-muted;
  color: $text-secondary;
}

.login-card__extra-item.is-disabled {
  opacity: 0.72;
}
</style>
