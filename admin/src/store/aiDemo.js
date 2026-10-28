import { defineStore } from 'pinia'
import { ref } from 'vue'
import { aiApi, getAiToken, setAiToken } from '@/api/aiDemo'

export const useAiDemoStore = defineStore('aiDemo', () => {
  const user = ref(null)
  const ready = ref(false)

  async function init() {
    if (ready.value) return
    if (getAiToken()) {
      try { user.value = await aiApi.me() } catch (_error) { setAiToken('') }
    }
    ready.value = true
  }

  async function login(username, password) {
    const result = await aiApi.login(username, password)
    setAiToken(result.token)
    user.value = result.user
    ready.value = true
    return result.user
  }

  async function logout() {
    try { if (getAiToken()) await aiApi.logout() } finally {
      setAiToken('')
      user.value = null
      ready.value = true
    }
  }

  return { user, ready, init, login, logout }
})
