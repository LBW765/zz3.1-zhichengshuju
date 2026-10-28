<script>
import { useAppStore } from '@/store/app'
import { useUserStore } from '@/store/user'
import { applyTheme } from '@/utils/theme'

export default {
  onLaunch() {
    const appStore = useAppStore()
    applyTheme(appStore.primaryColor, appStore.isDark)

    const userStore = useUserStore()
    if (userStore.hasLogin) {
      if (!userStore.userInfo.userName) {
        userStore.fetchUserInfo().catch(() => {
          userStore.clearUserState()
          uni.reLaunch({ url: '/pages/login/index' })
        })
      }
      uni.switchTab({ url: '/pages/home/index' })
    } else {
      uni.reLaunch({ url: '/pages/login/index' })
    }
  },
  onShow() {},
  onHide() {}
}
</script>

<style lang="scss">
@use './styles/reset.scss';
@use './styles/common.scss';
</style>
