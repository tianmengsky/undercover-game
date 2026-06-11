/**
 * auth.ts - 用户认证相关类型
 */

export interface User {
  id: string
  username: string
  nickname: string
  level: number
  exp: number
  avatarUrl?: string
  totalGames?: number
  wins?: number
  mvpCount?: number
}
