/**
 * game.ws.ts - socket.io 事件处理
 *
 * 职责：
 * - socket.io 认证中间件（handshake auth token）
 * - 连接时自动加入房间 + 发送 game_state 快照
 * - 客户端事件：player_speech / cast_vote / toggle_tts
 * - 房间管理事件：set_persona / set_words / kick_player / leave_room / leave_game / rejoin_game
 */
import { Server, Socket } from 'socket.io'
import { roomManager } from './game.manager.js'
import { authService } from '../auth/auth.service.js'
import { getPersona } from '../persona/persona.service.js'

export function registerWSHandlers(io: Server): void {
  // 广播完整房间状态
  function broadcastRoomState(gameId: string) {
    const r = roomManager.getRoom(gameId)
    if (!r) return
    roomManager.broadcast(gameId, 'room_updated', {
      roomCode: r.roomCode,
      roomName: r.roomName,
      hostUserId: r.hostUserId,
      players: r.players.map((p) => ({
        slotIndex: p.slotIndex, type: p.type, customName: p.customName,
        persona: p.aiPersona,
      })),
    })
  }

  // ── 认证中间件 ──
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined
    const gameId = socket.handshake.auth.gameId as string | undefined
    if (!token || !gameId) {
      return next(new Error('缺少 token 或 gameId'))
    }
    try {
      authService.verifyAccessToken(token)
      next()
    } catch {
      next(new Error('token 无效'))
    }
  })

  io.on('connection', (socket) => {
    const gameId = socket.handshake.auth.gameId as string
    const slotIndex = (socket.handshake.auth.slotIndex as number) ?? -1
    const userId = (socket.handshake.auth.userId as string) || ''

    const room = roomManager.getRoom(gameId)
    if (!room) {
      socket.emit('error', { message: '游戏不存在' })
      socket.disconnect()
      return
    }

    // 加入房间
    socket.join(gameId)

    // ── 重连恢复：如果是已断线玩家的重连 ──
    if (slotIndex >= 0 && room.players[slotIndex]?.type === 'ai') {
      // AI 托管的玩家重连：恢复为 human
      const oldPlayer = room.players[slotIndex]
      roomManager.updateRoom(gameId, {
        players: room.players.map((p, i) =>
          i === slotIndex ? { ...oldPlayer, type: 'human' as const } : p,
        ),
      })
      roomManager.broadcast(gameId, 'player_reconnected', {
        userId,
        nickname: oldPlayer.customName,
        slotIndex,
      })
    }

    // 连接时写入 userId 到 player 记录
    if (slotIndex >= 0 && room.players[slotIndex]) {
      roomManager.updateRoom(gameId, {
        players: room.players.map((p, i) =>
          i === slotIndex ? { ...p, userId } : p,
        ),
      })
    }

    // 发送当前游戏状态快照（用于 GameView）
    const player = slotIndex >= 0 ? room.players[slotIndex] : undefined
    socket.emit('game_state', {
      gameId,
      status: room.status,
      currentRound: room.currentRound,
      maxRounds: room.maxRounds,
      players: room.players.map((p) => ({
        slotIndex: p.slotIndex,
        customName: p.customName,
        isAI: p.type === 'ai',
        isAlive: p.isAlive,
        aiPersona: p.aiPersona,
      })),
      currentSpeakerIndex: -1,
      yourSlotIndex: slotIndex,
      yourWord: player?.word ?? '',
      yourRole: player?.role ?? '',
      speeches: room.speeches || [],
    })

    // 等待阶段发送 room_state（含房主和完整玩家类型），让 RoomView 初次进入时即可渲染
    if (room.status === 'waiting') {
      socket.emit('room_state', {
        roomCode: room.roomCode,
        roomName: room.roomName,
        hostUserId: room.hostUserId,
        players: room.players.map((p) => ({
          slotIndex: p.slotIndex,
          customName: p.customName || '',
          type: p.type,
          aiPersona: p.aiPersona || null,
        })),
      })
    }

    // ── 游戏事件 ──

    socket.on('player_speech', (payload: { gameId: string; content: string }) => {
      const content = payload?.content || ''
      if (content.length < 2 || content.length > 100) {
        socket.emit('error', { message: '发言内容需 2-100 字符' })
        return
      }
      roomManager.resolveHumanSpeech(gameId, content)
    })

    socket.on('cast_vote', (payload: { gameId: string; targetSlotIndex: number }) => {
      const target = payload?.targetSlotIndex
      if (target === undefined || target === null) {
        socket.emit('error', { message: '请指定投票目标' })
        return
      }
      roomManager.resolveHumanVote(gameId, target)
    })

    socket.on('toggle_tts', (payload: { enabled: boolean }) => {
      io.to(gameId).emit('tts_toggle', { enabled: payload?.enabled ?? false })
    })

    // ── 房间管理事件 ──

    // 房主设置 AI 人设 / 移除 AI / 添加 AI
    socket.on('set_persona', async (payload: { slotIndex: number; persona: string }) => {
      const r = roomManager.getRoom(gameId)
      if (!r || r.hostUserId !== userId) return

      // 拒绝覆盖人类玩家
      const currentPlayer = r.players[payload.slotIndex]
      if (currentPlayer?.type === 'human' && payload.persona !== 'empty') return

      // 拷贝当前 players 快照（避免 async await 期间 state 被修改）
      const snapshot = r.players.map((p) => ({ ...p }))

      // 补齐到 6 个槽位
      const fullPlayers = Array.from({ length: 6 }, (_, i) => {
        const existing = snapshot[i]
        if (existing) return existing
        return {
          slotIndex: i, customName: '', type: 'empty' as const,
          isAlive: false, isCurrentSpeaker: false, hasSpokenThisRound: false, hasVotedThisRound: false,
        }
      })

      if (payload.persona === 'empty') {
        // 移除 AI → 设为空位
        fullPlayers[payload.slotIndex] = {
          slotIndex: payload.slotIndex, customName: '', type: 'empty' as const,
          isAlive: false, isCurrentSpeaker: false, hasSpokenThisRound: false, hasVotedThisRound: false,
        }
      } else {
        // 从 DB 查出人设名（官方 + 自定义）
        const persona = await getPersona(payload.persona)
        fullPlayers[payload.slotIndex] = {
          ...fullPlayers[payload.slotIndex],
          customName: persona?.name || '',
          aiPersona: payload.persona as any,
          type: 'ai' as const,
          isAlive: true,
        }
      }

      roomManager.updateRoom(gameId, { players: fullPlayers })
      broadcastRoomState(gameId)
    })

    // 房主设置词语
    socket.on('set_words', (payload: { civilianWord: string; undercoverWord: string }) => {
      const r = roomManager.getRoom(gameId)
      if (!r || r.hostUserId !== userId) return
      roomManager.updateRoom(gameId, {
        civilianWord: payload.civilianWord,
        undercoverWord: payload.undercoverWord,
      })
      roomManager.broadcast(gameId, 'words_updated', {
        civilianWord: payload.civilianWord,
        undercoverWord: payload.undercoverWord,
      })
    })

    // 房主踢人
    socket.on('kick_player', (payload: { targetSlotIndex: number }) => {
      const r = roomManager.getRoom(gameId)
      if (!r || r.hostUserId !== userId) return
      if (payload.targetSlotIndex === undefined || payload.targetSlotIndex === null) return
      const kicked = r.players[payload.targetSlotIndex]
      if (!kicked || kicked.type !== 'human') return
      // 将踢出的槽位清空
      roomManager.updateRoom(gameId, {
        players: r.players.map((p) =>
          p.slotIndex === kicked.slotIndex
            ? { slotIndex: kicked.slotIndex, customName: '', type: 'empty' as const, isAlive: false, isCurrentSpeaker: false, hasSpokenThisRound: false, hasVotedThisRound: false }
            : p,
        ),
      })
      // 被踢者通过 room_updated 感知变化；同时发送 kicked_from_room 给全房间，客户端按 slotIndex 自行匹配
      roomManager.broadcast(gameId, 'kicked_from_room', { slotIndex: kicked.slotIndex })
      roomManager.broadcast(gameId, 'player_left', {
        userId: kicked.userId || '',
        nickname: kicked.customName,
        slotIndex: kicked.slotIndex,
      })
      broadcastRoomState(gameId)
    })

    // 离开房间（游戏前）
    socket.on('leave_room', () => {
      const r = roomManager.getRoom(gameId)
      if (!r || r.status !== 'waiting') return
      const leaver = r.players.find((p) => p.type === 'human' && p.slotIndex === slotIndex)
      if (!leaver) return
      // 清空该槽位
      roomManager.updateRoom(gameId, {
        players: r.players.map((p) =>
          p.slotIndex === slotIndex
            ? { slotIndex, customName: '', type: 'empty' as const, isAlive: false, isCurrentSpeaker: false, hasSpokenThisRound: false, hasVotedThisRound: false }
            : p,
        ),
      })
      roomManager.broadcast(gameId, 'player_left', {
        userId, nickname: leaver.customName, slotIndex,
      })
      // 如果是房主离开，转移给下一个人类玩家
      if (r.hostUserId === userId) {
        const nextHost = r.players.find((p) => p.type === 'human' && p.slotIndex !== slotIndex)
        if (nextHost) {
          roomManager.updateRoom(gameId, { hostUserId: nextHost.userId || '' })
          roomManager.broadcast(gameId, 'host_changed', {
            newHostId: nextHost.userId || '',
            newHostName: nextHost.customName,
          })
        }
      }
      broadcastRoomState(gameId)
      // 检查是否还有真人
      const hasHumans = roomManager.getRoom(gameId)!.players.some((p) => p.type === 'human')
      if (!hasHumans) {
        roomManager.broadcast(gameId, 'room_deleted', { reason: '所有玩家已离开' })
        roomManager.removeRoom(gameId)
      }
    })

    // 游戏中退出
    socket.on('leave_game', () => {
      const r = roomManager.getRoom(gameId)
      if (!r || r.status === 'waiting') return
      const leaver = r.players.find((p) => p.type === 'human' && p.slotIndex === slotIndex)
      if (!leaver) return
      // 将退出玩家转为 AI 托管
      roomManager.updateRoom(gameId, {
        players: r.players.map((p) =>
          p.slotIndex === slotIndex
            ? { ...p, type: 'ai' as const, aiPersona: 'default' as any }
            : p,
        ),
      })
      roomManager.broadcast(gameId, 'ai_takeover', {
        userId, slotIndex, nickname: leaver.customName,
      })
      // 检查是否所有真人都走了
      const hasHumans = roomManager.getRoom(gameId)!.players.some((p) => p.type === 'human')
      if (!hasHumans) {
        roomManager.broadcast(gameId, 'room_deleted', { reason: '所有玩家已离开' })
        roomManager.removeRoom(gameId)
      }
    })

    // 断线处理
    socket.on('disconnect', () => {
      const r = roomManager.getRoom(gameId)
      if (!r) return
      const dcPlayer = r.players.find((p) => p.type === 'human' && p.slotIndex === slotIndex)
      if (!dcPlayer) return

      // 仅在等待阶段启动 AI 接管定时器（游戏中由 leave_game 显式处理）
      if (r.status === 'waiting') {
        setTimeout(() => {
          const currentRoom = roomManager.getRoom(gameId)
          if (!currentRoom) return
          const stillDC = currentRoom.players[slotIndex]
          if (stillDC && stillDC.type === 'human') {
            roomManager.updateRoom(gameId, {
              players: currentRoom.players.map((p, i) =>
                i === slotIndex ? { ...p, type: 'ai' as const, aiPersona: 'default' as any } : p,
              ),
            })
            roomManager.broadcast(gameId, 'ai_takeover', {
              userId, slotIndex, nickname: stillDC.customName,
            })
            const hasHumans = roomManager.getRoom(gameId)!.players.some((p) => p.type === 'human')
            if (!hasHumans) {
              roomManager.broadcast(gameId, 'room_deleted', { reason: '所有玩家已离开' })
              roomManager.removeRoom(gameId)
            }
          }
        }, 30_000)
      }
    })
  })
}
