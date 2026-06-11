/**
 * auth.ts - 用户认证状态 (Pinia Store)
 *
 * 职责：响应式数据容器
 * 业务流程由 useAuth composable 编排
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as authService from '@/services/authService'
import type { User } from '@/types/auth'

export const useAuthStore = defineStore('auth', () => {
  // 优先从 sessionStorage 恢复 user（刷新后即时显示，不等 API）
  const savedUser = (() => { try { const v = sessionStorage.getItem('userCache'); if (v) { const u = JSON.parse(v); u.level = Math.floor((u.exp || 0) / 100) + 1; return u } return null } catch { return null } })()
  const user = ref<User | null>(savedUser)
  const token = ref<string | null>(sessionStorage.getItem('accessToken'))
  const refreshToken = ref<string | null>(sessionStorage.getItem('refreshToken'))

  const isAuthenticated = computed(() => !!token.value)

  function persistUser(u: User | null) {
    try {
      if (u) sessionStorage.setItem('userCache', JSON.stringify(u))
      else sessionStorage.removeItem('userCache')
    } catch { /* ignore */ }
  }

  async function login(username: string, password: string) {
    const res: any = await authService.login({ username, password })
    if (res.code === 0) {
      const u = res.data.user
      u.level = Math.floor((u.exp || 0) / 100) + 1
      user.value = u
      token.value = res.data.accessToken
      refreshToken.value = res.data.refreshToken
      sessionStorage.setItem('accessToken', res.data.accessToken)
      sessionStorage.setItem('refreshToken', res.data.refreshToken)
      persistUser(u)
    }
    return res
  }

  async function register(username: string, password: string, nickname?: string) {
    const res: any = await authService.register({ username, password, nickname })
    if (res.code === 0) {
      const u = res.data.user
      u.level = Math.floor((u.exp || 0) / 100) + 1
      user.value = u
      token.value = res.data.accessToken
      refreshToken.value = res.data.refreshToken
      sessionStorage.setItem('accessToken', res.data.accessToken)
      sessionStorage.setItem('refreshToken', res.data.refreshToken)
      persistUser(u)
    }
    return res
  }

  function logout() {
    user.value = null
    token.value = null
    refreshToken.value = null
    sessionStorage.removeItem('accessToken')
    sessionStorage.removeItem('refreshToken')
    persistUser(null)
  }

  async function fetchProfile() {
    const res: any = await authService.getMe()
    if (res.code === 0) {
      const u = res.data.user
      u.level = Math.floor((u.exp || 0) / 100) + 1
      user.value = u
      persistUser(u)
    }
  }

  async function addExp(gained: number) {
    if (!user.value) return
    user.value.exp = (user.value.exp || 0) + gained
    user.value.level = Math.floor(user.value.exp / 100) + 1
    persistUser(user.value)
    try { await authService.updateExp(user.value.exp) } catch { /* 容错 */ }
  }

  return { user, token, refreshToken, isAuthenticated, login, register, logout, fetchProfile, addExp }
})
