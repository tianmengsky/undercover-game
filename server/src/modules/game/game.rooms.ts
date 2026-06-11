/**
 * game.rooms.ts - 房间 REST API
 *
 * GET  /api/rooms      → 获取等待中的房间列表
 * POST /api/rooms/join → 通过房间号加入，返回 gameId + slotIndex
 */
import { authGuard } from '../auth/auth.guard.js'
import { success, error } from '../../shared/response.js'
import { ErrorCodes } from '../../shared/errors.js'
import { roomManager } from './game.manager.js'

export async function roomRoutes(app: any): Promise<void> {
  // 获取房间列表
  app.get('/api/rooms', { preHandler: authGuard }, async () => {
    const rooms = roomManager.getWaitingRooms()
    return success({ rooms })
  })

  // 通过房间号加入
  app.post('/api/rooms/join', { preHandler: authGuard }, async (req) => {
    const body = req.body as { roomCode: string; nickname?: string }
    const userId = (req as any).userId as string

    if (!body.roomCode || body.roomCode.length !== 6) {
      return error(ErrorCodes.INVALID_PARAMS, '房间号格式无效')
    }

    const room = roomManager.getRoomByCode(body.roomCode.toUpperCase())
    if (!room) {
      return error(ErrorCodes.GAME_NOT_FOUND, '房间不存在')
    }
    // 检查玩家是否已在房间中（含断线重连、游戏中退出后返回）
    const existingSlot = room.players.findIndex((p) => p.userId === userId)
    if (existingSlot >= 0) {
      return success({
        gameId: room.gameId,
        roomCode: room.roomCode,
        roomName: room.roomName,
        yourSlotIndex: existingSlot,
      })
    }

    if (room.status !== 'waiting') {
      return error(ErrorCodes.GAME_ALREADY_STARTED, '游戏已经开始')
    }

    // 找空位
    let slotIndex = -1
    for (let i = 0; i < 6; i++) {
      const p = room.players[i]
      if (!p || p.type === 'empty') {
        slotIndex = i
        break
      }
    }
    if (slotIndex === -1) {
      // 已满但状态 still waiting → 允许加入，替换 AI
      for (let i = 0; i < 6; i++) {
        const p = room.players[i]
        if (p && p.type === 'ai') {
          slotIndex = i
          break
        }
      }
    }
    if (slotIndex === -1) {
      return error(ErrorCodes.ROOM_FULL, '房间已满')
    }

    const newPlayer = {
      slotIndex,
      customName: body.nickname || `玩家${slotIndex + 1}`,
      type: 'human' as const,
      userId,
      isAlive: true,
      isCurrentSpeaker: false,
      hasSpokenThisRound: false,
      hasVotedThisRound: false,
    }

    // 补齐到 6 槽位后写入
    const fullPlayers = Array.from({ length: 6 }, (_, i) => {
      const existing = room.players[i]
      if (i === slotIndex) return newPlayer
      if (existing) return existing
      return { slotIndex: i, customName: '', type: 'empty' as const, isAlive: false, isCurrentSpeaker: false, hasSpokenThisRound: false, hasVotedThisRound: false }
    })

    roomManager.updateRoom(room.gameId, { players: fullPlayers })

    // 广播玩家加入事件
    roomManager.broadcast(room.gameId, 'player_joined', {
      userId,
      nickname: newPlayer.customName,
      slotIndex,
    })

    // 广播完整房间状态给所有人
    const updatedRoom = roomManager.getRoom(room.gameId)!
    roomManager.broadcast(room.gameId, 'room_updated', {
      roomCode: updatedRoom.roomCode,
      roomName: updatedRoom.roomName,
      hostUserId: updatedRoom.hostUserId,
      players: updatedRoom.players.map((p) => ({
        slotIndex: p.slotIndex, type: p.type, customName: p.customName,
        persona: p.aiPersona,
      })),
    })

    return success({
      gameId: room.gameId,
      roomCode: room.roomCode,
      roomName: room.roomName,
      yourSlotIndex: slotIndex,
    })
  })
}
