import { useUserStore } from '@/store/user'

export const useAuthGuard = () => {
  const userStore = useUserStore()

  const checkAuth = () => {
    if (!userStore.hasLogin) {
      uni.reLaunch({
        url: '/pages/login/index'
      })
    }
  }

  return {
    checkAuth
  }
}
