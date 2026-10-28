import { useUserStore } from '@/store/user'

export const vPermission = {
  mounted(el, binding) {
    const userStore = useUserStore()
    const permission = binding.value
    if (permission && !userStore.hasPermission(permission)) {
      el.parentNode?.removeChild(el)
    }
  }
}
