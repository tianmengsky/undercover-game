/**
 * useWebSocket.ts - socket.io 连接管理
 *
 * 对接 backend game.orchestrator.ts + game.ws.ts 的实际消息类型。
 * 功能：
 * - 自动连接 + 指数退避重连（socket.io 内置）
 * - 心跳保活（socket.io 内置 ping/pong）
 * - 消息分发（按 socket.io event name 路由）
 *
 * 导出接口保持与旧版兼容：{ isConnected, connect, disconnect, send, on }
 */
import { ref, onUnmounted } from 'vue'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'
import type {
  GameStatePayload,
  GameStartedPayload,
  PhaseChangePayload,
  CurrentSpeakerPayload,
  AISpeechStartPayload,
  AISpeechChunkPayload,
  AISpeechEndPayload,
  PlayerSpeechBroadcastPayload,
  CurrentVoterPayload,
  VoteCastPayload,
  VoteTimeoutPayload,
  NextRoundPayload,
  GameOverPayload,
  GameErrorPayload,
  ErrorPayload,
} from '@/types/ws'

type MessageHandler = (payload: unknown) => void

const WS_URL = `http://${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`

export function useWebSocket() {
  const socket = ref<Socket | null>(null)
  const isConnected = ref(false)

  // 预连接阶段暂存的自定义 handler（connect 后批量注册）
  let pendingHandlers: Array<{ type: string; handler: MessageHandler }> = []

  const authStore = useAuthStore()
  const gameStore = useGameStore()

  // ── 注册默认消息处理器（connect 后调用） ──
  function registerDefaultHandlers(s: Socket) {
    s.on('game_state', (p) => gameStore.setGameState(p as GameStatePayload))
    s.on('game_started', (p) => {
      const payload = p as GameStartedPayload
      gameStore.setGameState(payload)
      gameStore.setPhase('speaking')
    })
    s.on('phase_change', (p) => {
      const payload = p as PhaseChangePayload
      gameStore.setPhase(payload.phase)
    })
    s.on('current_speaker', (p) => {
      const payload = p as CurrentSpeakerPayload
      gameStore.setCurrentSpeaker(payload.slotIndex)
    })
    s.on('request_speech', () => {})
    s.on('speech_timeout', () => {})
    s.on('ai_speech_start', (p) => {
      const payload = p as AISpeechStartPayload
      gameStore.addSpeech({
        slotIndex: payload.slotIndex,
        content: '',
        round: gameStore.currentRound,
        isAI: true,
        timestamp: Date.now(),
      })
    })
    s.on('ai_speech_chunk', (p) => {
      const payload = p as AISpeechChunkPayload
      gameStore.addAISpeechChunk(payload.slotIndex, payload.chunk)
    })
    s.on('ai_speech_end', (p) => {
      const payload = p as AISpeechEndPayload
      const speeches = gameStore.speeches
      const idx = speeches.length - 1
      if (idx >= 0 && speeches[idx].slotIndex === payload.slotIndex) {
        speeches.splice(idx, 1, { ...speeches[idx], content: payload.content, timestamp: Date.now() })
      }
      gameStore.players = gameStore.players.map((pl) =>
        pl.slotIndex === payload.slotIndex ? { ...pl, hasSpokenThisRound: true } : pl,
      )
    })
    s.on('player_speech_broadcast', (p) => {
      const payload = p as PlayerSpeechBroadcastPayload
      gameStore.addSpeech({
        slotIndex: payload.slotIndex,
        content: payload.content,
        round: gameStore.currentRound,
        isAI: false,
        timestamp: Date.now(),
      })
    })
    s.on('current_voter', (p) => {
      const payload = p as CurrentVoterPayload
      gameStore.setCurrentVoter(payload.slotIndex)
    })
    s.on('request_vote', () => {})
    s.on('vote_cast', (p) => {
      const payload = p as VoteCastPayload
      gameStore.addVote(payload.voterSlot, payload.targetSlot)
    })
    s.on('vote_timeout', (p) => {
      const payload = p as VoteTimeoutPayload
      gameStore.addVote(payload.slotIndex, payload.votedFor)
    })
    s.on('player_eliminated', () => {}) // GameView 自定义 handler 负责
    s.on('elimination_tie', () => {})
    s.on('next_round', (p) => {
      const payload = p as NextRoundPayload
      gameStore.nextRound(payload.round)
    })
    s.on('game_over', (p) => {
      const payload = p as GameOverPayload
      gameStore.setGameOver(
        payload.winner,
        payload.civilianWord,
        payload.undercoverWord,
        payload.undercoverSlotIndex,
        payload.newAchievements || [],
      )
    })
    s.on('game_error', (p) => {
      const payload = p as GameErrorPayload
      console.error('[WS] 游戏异常:', payload.message)
    })
    s.on('error', (p) => {
      const payload = p as ErrorPayload
      console.error('[WS] 错误:', payload.message)
    })
  }

  // ── 连接 ──
  function connect(gameId: string, slotIndex?: number) {
    const token = authStore.token
    if (!token || !gameId) {
      console.warn('[WS] 缺少 token 或 gameId，无法连接')
      return
    }

    const s = io(WS_URL, {
      auth: { token, gameId, slotIndex, userId: authStore.user?.id || '' },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 16000,
    })

    socket.value = s

    s.on('connect', () => {
      isConnected.value = true
    })

    s.on('disconnect', () => {
      isConnected.value = false
    })

    // 注册默认处理器
    registerDefaultHandlers(s)

    // 注册预连接阶段暂存的自定义 handler
    for (const { type, handler } of pendingHandlers) {
      s.on(type, handler)
    }
    pendingHandlers = []
  }

  // ── 发送消息 ──
  function send(type: string, payload: unknown = {}) {
    if (socket.value?.connected) {
      socket.value.emit(type, payload)
    }
  }

  // ── 断开 ──
  function disconnect() {
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
    }
    isConnected.value = false
    pendingHandlers = []
  }

  // ── 注册自定义 handler ──
  // 如果 socket 已连接则直接注册，否则暂存到 connect 后批量注册
  function on(type: string, handler: MessageHandler) {
    if (socket.value) {
      socket.value.on(type, handler)
    } else {
      pendingHandlers.push({ type, handler })
    }
  }

  // ── 清理 ──
  onUnmounted(() => {
    disconnect()
  })

  return { isConnected, connect, disconnect, send, on }
}
