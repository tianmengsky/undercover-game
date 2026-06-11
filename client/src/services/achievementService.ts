/**
 * achievementService.ts - 成就 REST API
 */
import { api } from './api'

/** 获取所有成就定义（含解锁条件、奖励等） */
export function getAchievements() {
  return api('/stats/achievements')
}

/** 获取指定用户的已解锁成就列表 */
export function getUserAchievements(userId: string) {
  return api(`/users/${userId}/achievements`)
}
