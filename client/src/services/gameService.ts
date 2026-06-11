/**
 * gameService.ts - 游戏相关 REST API
 * POST   /api/games              创建游戏
 * POST   /api/games/:id/words/generate   AI 生成词语
 * POST   /api/games/:id/start    开始游戏
 * GET    /api/games/:id/result   结算数据
 */
import { api } from './api'

export function createGame(data: {
  players?: Array<{ slotIndex: number; type: string; persona?: string; customName?: string }>
  civilianWord?: string
  undercoverWord?: string
  roomName?: string
  roomCode?: string
  nickname?: string
}) {
  return api('/games', { method: 'POST', body: data })
}

export function generateWords(gameId: string, difficulty?: string) {
  return api(`/games/${gameId}/words/generate`, { method: 'POST', body: { difficulty } })
}

export function startGame(gameId: string, body?: { difficulty?: string }) {
  return api(`/games/${gameId}/start`, { method: 'POST', body: body || {} })
}

export function getGameResult(gameId: string) {
  return api(`/games/${gameId}/result`)
}

export function getReplay(gameId: string) {
  return api(`/games/${gameId}/replay`)
}
