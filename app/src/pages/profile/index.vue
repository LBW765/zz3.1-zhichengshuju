<template>
  <view class="app-page">
    <AppNavbar title="个人资料" :backable="true" />

    <view class="app-page__body profile-page">
      <!-- 头像（无卡片，直接点击换头像） -->
      <view class="profile-avatar-section">
        <view class="profile-avatar-wrap" @click="handleAvatarChange">
          <image
            v-if="avatarUrl"
            class="profile-avatar"
            :src="avatarUrl"
            mode="aspectFill"
          />
          <view v-else class="profile-avatar profile-avatar--placeholder">
            <text class="profile-avatar__letter">{{ avatarLetter }}</text>
          </view>
          <view class="profile-avatar__badge">换</view>
        </view>
        <view class="profile-avatar-hint">点击更换头像</view>
      </view>

      <!-- 可编辑资料 -->
      <AppCard customClass="profile-card">
        <view class="profile-item">
          <text class="profile-item__label">用户名</text>
          <text class="profile-item__value">{{ info.userName || '-' }}</text>
        </view>
        <view class="profile-item">
          <text class="profile-item__label">昵称</text>
          <input v-model="form.nickName" class="profile-item__input" placeholder="请输入昵称" maxlength="20" @blur="handleSave" />
        </view>
        <view class="profile-item">
          <text class="profile-item__label">邮箱</text>
          <input v-model="form.email" class="profile-item__input" placeholder="请输入邮箱" type="email" @blur="handleSave" />
        </view>
        <view class="profile-item">
          <text class="profile-item__label">手机号</text>
          <input v-model="form.phone" class="profile-item__input" placeholder="请输入手机号" type="number" maxlength="11" @blur="handleSave" />
        </view>
        <view class="profile-item">
          <text class="profile-item__label">部门</text>
          <text class="profile-item__value">{{ info.deptName || '-' }}</text>
        </view>
        <view class="profile-item">
          <text class="profile-item__label">角色</text>
          <text class="profile-item__value">{{ info.roleName || '-' }}</text>
        </view>
      </AppCard>

      <!-- 其他操作 -->
      <AppCard customClass="profile-more-card">
        <view class="profile-more-item" @click="goChangePassword">
          <text>修改密码</text>
          <text class="profile-more-item__arrow">›</text>
        </view>
        <view class="profile-more-item profile-more-item--danger" @click="handleLogout">
          <text>退出登录</text>
          <text class="profile-more-item__arrow">›</text>
        </view>
      </AppCard>
    </view>
  </view>
</template>

<script setup>
import { computed, onMounted, reactive } from 'vue'
import AppNavbar from '@/components/app-navbar/index.vue'
import AppCard from '@/components/app-card/index.vue'
import { useUserStore } from '@/store/user'
import { useAuthGuard } from '@/composables/useAuthGuard'
import { uploadFile } from '@/api/user'

const { checkAuth } = useAuthGuard()
checkAuth()

const userStore = useUserStore()
const info = computed(() => userStore.userInfo)

const form = reactive({
  nickName: '',
  email: '',
  phone: ''
})

onMounted(() => {
  form.nickName = info.value.nickName || ''
  form.email = info.value.email || ''
  form.phone = info.value.phone || ''
})

const avatarUrl = computed(() => {
  if (!info.value.avatar) return ''
  if (/^https?:\/\//.test(info.value.avatar)) return info.value.avatar
  const baseURL = import.meta.env.VITE_APP_BASE_API || '/api'
  const base = baseURL.replace(/\/api$/, '')
  return `${base}${info.value.avatar}`
})

const avatarLetter = computed(() => {
  const name = info.value.nickName || info.value.userName || ''
  return name.charAt(0).toUpperCase() || '?'
})

const handleSave = async () => {
  try {
    await userStore.saveProfile({
      nickName: form.nickName,
      email: form.email,
      phone: form.phone,
      avatar: info.value.avatar || ''
    })
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch {
    // saveProfile 内部已处理错误提示
  }
}

const handleAvatarChange = () => {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      const filePath = res.tempFilePaths[0]
      uni.showLoading({ title: '上传中...' })
      try {
        const uploadRes = await uploadFile(filePath)
        const avatar = uploadRes.data?.url || ''
        await userStore.saveProfile({
          nickName: form.nickName,
          email: form.email,
          phone: form.phone,
          avatar
        })
        uni.showToast({ title: '头像已更新', icon: 'success' })
      } finally {
        uni.hideLoading()
      }
    }
  })
}

const goChangePassword = () => {
  uni.navigateTo({ url: '/pages/change-password/index' })
}

const handleLogout = async () => {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出当前账号吗？',
    confirmText: '退出',
    confirmColor: '#F56C6C',
    success: async (res) => {
      if (!res.confirm) return
      await userStore.userLogout()
      uni.reLaunch({ url: '/pages/login/index' })
    }
  })
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.profile-page {
  padding-top: $space-lg;
}

.profile-avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: $space-lg;
}

.profile-avatar-wrap {
  position: relative;
  width: 128rpx;
  height: 128rpx;
}

.profile-avatar {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background: $bg-muted;
}

.profile-avatar--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, $primary-color, $primary-light);
}

.profile-avatar__letter {
  font-size: 48rpx;
  font-weight: 700;
  color: #fff;
}

.profile-avatar__badge {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: $primary-color;
  color: #fff;
  font-size: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-avatar-hint {
  margin-top: 12rpx;
  font-size: 22rpx;
  color: $text-light;
}

:deep(.profile-card) {
  padding: 0 28rpx;
}

.profile-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
  min-height: 100rpx;
  border-bottom: 1px solid $border-light;
}

.profile-item:last-child {
  border-bottom: none;
}

.profile-item__label {
  flex-shrink: 0;
  font-size: 26rpx;
  color: $text-secondary;
}

.profile-item__value {
  flex: 1;
  text-align: right;
  font-size: 28rpx;
  color: $text-primary;
}

.profile-item__input {
  flex: 1;
  text-align: right;
  font-size: 28rpx;
  color: $text-primary;
  background: transparent;
}

:deep(.profile-more-card) {
  margin-top: 24rpx;
  padding: 0 28rpx;
}

.profile-more-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 96rpx;
  border-bottom: 1px solid $border-light;
  font-size: 28rpx;
  color: $text-primary;
}

.profile-more-item:last-child {
  border-bottom: none;
}

.profile-more-item--danger {
  color: $danger-color;
}

.profile-more-item__arrow {
  font-size: 36rpx;
  color: $text-light;
}
</style>
