/**
 * authService.ts - 认证 REST API
 */
import { api } from './api'

export function register(data: { username: string; password: string; nickname?: string }) {
  return api('/auth/register', { method: 'POST', body: data })
}

export function login(data: { username: string; password: string }) {
  return api('/auth/login', { method: 'POST', body: data })
}

export function refreshToken(refreshToken: string) {
  return api('/auth/refresh', { method: 'POST', body: { refreshToken } })
}

export function getMe() {
  return api('/auth/me')
}

export function updateExp(exp: number) {
  return api('/auth/exp', { method: 'PATCH', body: { exp } })
}
