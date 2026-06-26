/**
 * game.routes.ts - 游戏路由（REST）
 */
import crypto from 'node:crypto'
import { authGuard } from '../auth/auth.guard.js'
import { success, error } from '../../shared/response.js'
import { ErrorCodes } from '../../shared/errors.js'
import { roomManager } from './game.manager.js'
import { generateWordPair } from './game.ai.js'
import { runGameLoop } from './game.orchestrator.js'
import { getReplay } from './game.replay.js'
import { calcExpGained } from '../stats/stats.service.js'
import type { Player, PlayerRole, AIPersona } from '../../types/game.js'

// 随机生成 6 位房间号
function generate6CharCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function gameRoutes(app: any): Promise<void> {
  // ═══════════════════════════════════════
  // REST 路由
  // ═══════════════════════════════════════

  // 创建游戏
  app.post('/api/games', { preHandler: authGuard }, async (req) => {
    const body = req.body as {
      players?: Array<{
        slotIndex: number
        type?: string
        persona?: string
        customName?: string
      }>
      civilianWord?: string
      undercoverWord?: string
      roomName?: string
      roomCode?: string
      nickname?: string
    }

    const userId = (req as any).userId as string
    const nickname = body.nickname || '玩家'

    const gameId = crypto.randomUUID()
    const roomCode = body.roomCode || generate6CharCode()

    // 构建 players：第一个槽位固定为房主 human
    let players: Player[]
    if (body.players && body.players.length > 0) {
      players = body.players.map(
        (p): Player => ({
          slotIndex: p.slotIndex,
          customName: p.customName || `玩家${p.slotIndex + 1}`,
          type: (p.type === 'human' ? 'human' : 'ai') as Player['type'],
          isAlive: true,
          aiPersona: p.persona as AIPersona,
          isCurrentSpeaker: false,
          hasSpokenThisRound: false,
          hasVotedThisRound: false,
        }),
      )
    } else {
      // 空 players → 创建空房间，房主占 slot 0
      players = [{ slotIndex: 0, customName: nickname, type: 'human' as const, isAlive: true, isCurrentSpeaker: false, hasSpokenThisRound: false, hasVotedThisRound: false }]
    }

    const roomName = body.roomName || `${nickname}的房间`

    roomManager.createRoom(gameId, {
      roomCode,
      roomName,
      hostUserId: userId,
      civilianWord: body.civilianWord || '',
      undercoverWord: body.undercoverWord || '',
      players,
      humanUserId: userId,
    })

    return success(
      {
        gameId,
        roomCode,
        roomName,
        status: 'waiting',
        players,
        civilianWord: body.civilianWord || '',
        undercoverWord: body.undercoverWord || '',
      },
      '游戏创建成功',
    )
  })

  // 获取游戏信息
  app.get('/api/games/:id', { preHandler: authGuard }, async (req) => {
    const { id } = req.params as { id: string }
    const room = roomManager.getRoom(id)
    if (!room) {
      return error(ErrorCodes.GAME_NOT_FOUND, '游戏不存在')
    }
    return success({
      gameId: room.gameId,
      status: room.status,
      currentRound: room.currentRound,
      players: room.players.map((p) => ({
        slotIndex: p.slotIndex,
        customName: p.customName,
        type: p.type,
        isAlive: p.isAlive,
      })),
    })
  })

  // AI 生成词语（调用 Dify，同时写入房间）
  app.post('/api/games/:id/words/generate', { preHandler: authGuard }, async (req) => {
    const { id } = req.params as { id: string }
    const body = req.body as { difficulty?: string }
    const difficulty = body.difficulty || '适中'

    try {
      const result = await generateWordPair(difficulty)
      roomManager.updateRoom(id, {
        civilianWord: result.commonWord,
        undercoverWord: result.undercoverWord,
      })
      return success(result, '词语生成成功')
    } catch (err) {
      console.error('[words/generate] Dify 调用失败:', err)
      const fallback = { commonWord: '苹果', undercoverWord: '梨子', difficulty }
      roomManager.updateRoom(id, {
        civilianWord: fallback.commonWord,
        undercoverWord: fallback.undercoverWord,
      })
      return success(fallback, '词语生成成功（离线模式）')
    }
  })

  // 开始游戏
  app.post('/api/games/:id/start', { preHandler: authGuard }, async (req) => {
    const { id } = req.params as { id: string }
    const body = req.body as { difficulty?: string }
    const room = roomManager.getRoom(id)
    if (!room) {
      return error(ErrorCodes.GAME_NOT_FOUND, '游戏不存在')
    }
    if (room.status !== 'waiting') {
      return error(ErrorCodes.GAME_ALREADY_STARTED, '游戏已经开始')
    }
    if (room.players.length < 2) {
      return error(40001, '至少需要 2 名玩家')
    }

    if (!room.civilianWord || !room.undercoverWord) {
      // 自动生成词语（/words/generate 端点失败时的最后保障）
      const difficulty = body.difficulty || '适中'
      try {
        const result = await generateWordPair(difficulty)
        roomManager.updateRoom(id, {
          civilianWord: result.commonWord,
          undercoverWord: result.undercoverWord,
        })
      } catch {
        return error(40002, '词语生成失败，请稍后重试')
      }
    }

    // 随机分配卧底
    const totalPlayers = room.players.length
    const undercoverSlotIndex = Math.floor(Math.random() * totalPlayers)
    const updatedPlayers = room.players.map((p, i) => ({
      ...p,
      role: (i === undercoverSlotIndex ? 'undercover' : 'civilian') as PlayerRole,
      word: i === undercoverSlotIndex ? room.undercoverWord : room.civilianWord,
    }))

    roomManager.updateRoom(id, {
      status: 'role_assign',
      undercoverSlotIndex,
      currentRound: 1,
      players: updatedPlayers,
    })

    // 异步启动游戏循环（不阻塞 HTTP 响应）
    runGameLoop(id).catch((err) => {
      console.error('[game.routes] game loop 异常:', err)
    })

    return success({ gameId: id, status: 'role_assign' }, '游戏开始')
  })

  // 获取结算数据（房间已删除时回退为仅 replay 数据）
  app.get('/api/games/:id/result', { preHandler: authGuard }, async (req) => {
    const { id } = req.params as { id: string }
    const room = roomManager.getRoom(id)
    const events = getReplay(id)
    if (!room && events.length === 0) {
      return error(ErrorCodes.GAME_NOT_FOUND, '游戏不存在')
    }
    // 房间已被删除但回放数据还在 → 从 replay events 重建基础结算信息
    if (!room) {
      const gameOverEvent = events.find((e) => e.type === 'game_over')
      const gameStartEvent = events.find((e) => e.type === 'game_start')
      const eliminationEvents = events.filter((e) => e.type === 'elimination')
      const speechEvents = events.filter((e) => e.type === 'speech')
      return success({
        gameId: id,
        winner: gameOverEvent?.payload?.winner ?? 'civilian',
        civilianWord: gameOverEvent?.payload?.civilianWord ?? '',
        undercoverWord: gameOverEvent?.payload?.undercoverWord ?? '',
        totalRounds: gameOverEvent?.payload?.totalRounds ?? 0,
        players: [],
        eventsCount: events.length,
        isReplayOnly: true,
      })
    }

    const undercoverEliminated = room.eliminatedPlayers.includes(room.undercoverSlotIndex)
    const winner = undercoverEliminated ? 'civilian' : 'undercover'

    // MVP：投票命中卧底次数最多的玩家
    let mvpSlot = -1
    let mvpScore = -1
    const correctVotes = new Map<number, number>()
    for (const v of room.votes) {
      if (v.targetSlot === room.undercoverSlotIndex) {
        const c = (correctVotes.get(v.voterSlot) || 0) + 1
        correctVotes.set(v.voterSlot, c)
        if (c > mvpScore) { mvpScore = c; mvpSlot = v.voterSlot }
      }
    }

    // 计算每人经验（使用统一公式 + 成就奖励）
    const players = room.players.map((p) => {
      const isWinner = p.role === winner || (winner === 'civilian' && p.role === 'civilian')
      const isMvp = p.slotIndex === mvpSlot
      let gained = calcExpGained({
        won: isWinner,
        survivedRounds: p.isAlive ? room.currentRound : room.currentRound - 1,
        isMvp,
        role: (p.role as 'civilian' | 'undercover') || 'civilian',
      })
      // 人类玩家加上成就奖励经验
      if (p.type === 'human') {
        gained += room.achievementExpGained || 0
      }
      return {
        slotIndex: p.slotIndex,
        customName: p.customName,
        type: p.type,
        role: p.role,
        isAlive: p.isAlive,
        aiPersona: p.aiPersona,
        isMvp,
        expGained: gained,
      }
    })

    return success({
      gameId: id,
      winner,
      civilianWord: room.civilianWord,
      undercoverWord: room.undercoverWord,
      totalRounds: room.currentRound,
      players,
    }, 'success')
  })

  // 游戏回放
  app.get('/api/games/:id/replay', { preHandler: authGuard }, async (req) => {
    const { id } = req.params as { id: string }
    const room = roomManager.getRoom(id)
    const events = getReplay(id)

    // 回放数据为空的两种情况：游戏未结束 / 房间已被清理
    if (events.length === 0) {
      if (!room) {
        return error(ErrorCodes.NOT_FOUND, '回放数据不存在（房间可能已被删除）')
      }
      if (room.status !== 'finished') {
        return error(ErrorCodes.NOT_FOUND, '游戏还未结束')
      }
      return error(ErrorCodes.NOT_FOUND, '回放数据为空')
    }
    const undercoverEliminated = room?.eliminatedPlayers?.includes(room?.undercoverSlotIndex ?? -1) ?? false
    const winner = undercoverEliminated ? 'civilian' : 'undercover'

    return success({
      gameId: id,
      winner,
      civilianWord: room?.civilianWord ?? '',
      undercoverWord: room?.undercoverWord ?? '',
      totalRounds: room?.currentRound ?? 0,
      players: room?.players.map((p) => ({
        slotIndex: p.slotIndex,
        customName: p.customName,
        type: p.type,
        role: p.role,
        isAlive: p.isAlive,
        aiPersona: p.aiPersona,
      })) ?? [],
      events,
    })
  })
}
