/**
 * statsService.ts - 排行榜/统计 REST API
 */
import { api } from './api'

export function getLeaderboard(params?: { type?: string; page?: number; pageSize?: number }) {
  const query = new URLSearchParams()
  if (params?.type) query.set('type', params.type)
  if (params?.page) query.set('page', String(params.page))
  if (params?.pageSize) query.set('pageSize', String(params.pageSize))
  const qs = query.toString()
  return api(`/stats/leaderboard${qs ? '?' + qs : ''}`)
}

export function getUserStats(userId: string) {
  return api(`/stats/user/${userId}`)
}

export function getUserHistory(userId: string, params?: { page?: number; pageSize?: number }) {
  const query = new URLSearchParams()
  if (params?.page) query.set('page', String(params.page))
  if (params?.pageSize) query.set('pageSize', String(params.pageSize))
  const qs = query.toString()
  return api(`/users/${userId}/history${qs ? '?' + qs : ''}`)
}

export function getDailyChallenge() {
  return api('/stats/daily-challenge')
}
