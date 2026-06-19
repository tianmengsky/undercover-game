/**
 * api.ts - ofetch 实例 + 拦截器
 */
import { ofetch } from 'ofetch'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

export const api = ofetch.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },

  // 请求拦截：自动注入 Token
  onRequest({ options }) {
    const token = sessionStorage.getItem('accessToken')
    if (token) {
      options.headers.set('Authorization', `Bearer ${token}`)
    }
  },

  // 响应错误：提取服务端消息抛给调用方
  onResponseError({ response }) {
    const body = response._data
    const message = body?.message || `请求失败 (${response.status})`
    const error = new Error(message) as Error & { code: number; status: number }
    error.code = body?.code || 0
    error.status = response.status
    throw error
  },
})

// ── 通用响应类型 ──
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data?: T
}
