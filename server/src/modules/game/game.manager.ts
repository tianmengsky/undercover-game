/**
 * game.manager.ts - 房间管理器（内存 Map 存储 + 人类输入等待）
 *
 * 广播通过 socket.io Room 实现，io 实例由 index.ts 在 listen 后通过 setIO() 注入。
 */
import type { Player, Speech, VoteRecord } from '../../types/game.js'
import type { Server as SocketIOServer } from 'socket.io'

export interface GameRoom {
  gameId: string
  status: string
  roomCode: string    // 6 位公开房间号
  roomName: string    // 房间名称
  hostUserId: string  // 房主 userId
  civilianWord: string
  undercoverWord: string
  players: Player[]
  currentRound: number
  eliminatedPlayers: number[]
  undercoverSlotIndex: number
  maxRounds: number
  speeches: Speech[]
  votes: VoteRecord[]
  humanUserId: string // 已废弃，保留兼容
  achievementExpGained: number
}

const rooms = new Map<string, GameRoom>()

// socket.io Server 实例，由 index.ts 在 listen 后通过 setIO() 注入
let _io: SocketIOServer | null = null

export function setIO(io: SocketIOServer): void {
  _io = io
}

// 人类输入等待 resolver
const speechResolvers = new Map<string, { resolve: (content: string) => void; timer: ReturnType<typeof setTimeout> }>()
const voteResolvers = new Map<string, { resolve: (targetSlot: number) => void; timer: ReturnType<typeof setTimeout> }>()

// 正在运行的 game loop 标记，防止重复启动
const runningLoops = new Set<string>()

export const roomManager = {
  // ═══════════════ 房间 CRUD ═══════════════
  createRoom(gameId: string, data: Partial<GameRoom>): GameRoom {
    const room: GameRoom = {
      gameId,
      status: 'waiting',
      roomCode: data.roomCode || '',
      roomName: data.roomName || '',
      hostUserId: data.hostUserId || '',
      civilianWord: data.civilianWord || '',
      undercoverWord: data.undercoverWord || '',
      players: data.players || [],
      currentRound: 0,
      eliminatedPlayers: [],
      undercoverSlotIndex: -1,
      maxRounds: data.maxRounds || 5,
      speeches: [],
      votes: [],
      humanUserId: data.humanUserId || '',
      achievementExpGained: 0,
    }
    rooms.set(gameId, room)
    return room
  },

  getRoom(gameId: string): GameRoom | undefined {
    return rooms.get(gameId)
  },

  /** 通过房间号查找房间 */
  getRoomByCode(roomCode: string): GameRoom | undefined {
    for (const room of rooms.values()) {
      if (room.roomCode === roomCode) return room
    }
    return undefined
  },

  /** 获取所有非结束的房间列表 */
  getWaitingRooms(): Array<{ roomCode: string; roomName: string; playerCount: number; status: string; hostName: string }> {
    const list: Array<{ roomCode: string; roomName: string; playerCount: number; status: string; hostName: string }> = []
    for (const room of rooms.values()) {
      if (room.status === 'finished') continue
      const host = room.players.find((p) => p.type === 'human' && p.customName)
      list.push({
        roomCode: room.roomCode,
        roomName: room.roomName,
        playerCount: room.players.filter((p) => p.type !== 'empty').length,
        status: room.status,
        hostName: host?.customName || '未知',
      })
    }
    return list
  },

  updateRoom(gameId: string, updates: Partial<GameRoom>): void {
    const room = rooms.get(gameId)
    if (room) Object.assign(room, updates)
  },

  removeRoom(gameId: string): void {
    rooms.delete(gameId)
    // 清理关联资源
    speechResolvers.delete(gameId)
    voteResolvers.delete(gameId)
    runningLoops.delete(gameId)
  },

  // ═══════════════ 广播（通过 socket.io Room） ═══════════════
  broadcast(gameId: string, event: string, payload: unknown): void {
    if (_io) _io.to(gameId).emit(event, payload)
  },

  // ═══════════════ Game Loop 管理 ═══════════════
  isLoopRunning(gameId: string): boolean {
    return runningLoops.has(gameId)
  },

  markLoopRunning(gameId: string): void {
    runningLoops.add(gameId)
  },

  markLoopDone(gameId: string): void {
    runningLoops.delete(gameId)
  },

  // ═══════════════ 人类输入等待 ═══════════════
  /** 等待人类玩家发言，超时抛错 */
  waitForHumanSpeech(gameId: string, timeoutMs: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        speechResolvers.delete(gameId)
        reject(new Error('SPEECH_TIMEOUT'))
      }, timeoutMs)
      speechResolvers.set(gameId, { resolve, timer })
    })
  },

  /** WS 收到 player_speech 时调用 */
  resolveHumanSpeech(gameId: string, content: string): void {
    const entry = speechResolvers.get(gameId)
    if (entry) {
      clearTimeout(entry.timer)
      speechResolvers.delete(gameId)
      entry.resolve(content)
    }
  },

  /** 等待人类玩家投票，超时抛错 */
  waitForHumanVote(gameId: string, timeoutMs: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        voteResolvers.delete(gameId)
        reject(new Error('VOTE_TIMEOUT'))
      }, timeoutMs)
      voteResolvers.set(gameId, { resolve, timer })
    })
  },

  /** WS 收到 cast_vote 时调用 */
  resolveHumanVote(gameId: string, targetSlot: number): void {
    const entry = voteResolvers.get(gameId)
    if (entry) {
      clearTimeout(entry.timer)
      voteResolvers.delete(gameId)
      entry.resolve(targetSlot)
    }
  },
}
