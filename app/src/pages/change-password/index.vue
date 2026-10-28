<template>
  <view class="app-page">
    <AppNavbar title="修改密码" :backable="true" />
    <view class="app-page__body change-password-page">
      <AppCard customClass="cp-card">
        <view class="cp-field">
          <text class="cp-field__label">当前密码</text>
          <input
            v-model="form.oldPassword"
            class="cp-field__input"
            password
            placeholder="请输入当前密码"
          />
        </view>
        <view class="cp-field">
          <text class="cp-field__label">新密码</text>
          <input
            v-model="form.newPassword"
            class="cp-field__input"
            password
            placeholder="至少 6 位"
          />
        </view>
        <view class="cp-field cp-field--last">
          <text class="cp-field__label">确认新密码</text>
          <input
            v-model="form.confirmPassword"
            class="cp-field__input"
            password
            placeholder="再次输入新密码"
          />
        </view>
      </AppCard>

      <view class="cp-submit-wrap">
        <view
          class="app-primary-btn"
          :class="{ 'is-loading': saving }"
          @click="handleSubmit"
        >{{ saving ? '提交中...' : '确认修改' }}</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { reactive, ref } from 'vue'
import AppNavbar from '@/components/app-navbar/index.vue'
import AppCard from '@/components/app-card/index.vue'
import { useUserStore } from '@/store/user'
import { useAuthGuard } from '@/composables/useAuthGuard'

const { checkAuth } = useAuthGuard()
checkAuth()

const userStore = useUserStore()
const saving = ref(false)

const form = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const handleSubmit = async () => {
  if (!form.oldPassword) {
    uni.showToast({ title: '请输入当前密码', icon: 'none' })
    return
  }
  if (form.newPassword.length < 6) {
    uni.showToast({ title: '新密码至少 6 位', icon: 'none' })
    return
  }
  if (form.newPassword !== form.confirmPassword) {
    uni.showToast({ title: '两次密码不一致', icon: 'none' })
    return
  }
  if (saving.value) return

  saving.value = true
  try {
    await userStore.changePassword({
      oldPassword: form.oldPassword,
      newPassword: form.newPassword
    })
    uni.showToast({ title: '修改成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1500)
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.change-password-page {
  padding-top: $space-md;
}

:deep(.cp-card) {
  padding: 0 28rpx;
}

.cp-field {
  display: flex;
  align-items: center;
  gap: 24rpx;
  min-height: 100rpx;
  border-bottom: 1px solid $border-light;
}

.cp-field--last {
  border-bottom: none;
}

.cp-field__label {
  flex-shrink: 0;
  width: 160rpx;
  font-size: 26rpx;
  color: $text-secondary;
}

.cp-field__input {
  flex: 1;
  font-size: 28rpx;
  color: $text-primary;
  background: transparent;
}

.cp-submit-wrap {
  padding: 40rpx $space-lg 0;
}
</style>
