/**
 * ws.ts - WebSocket 消息协议类型定义
 *
 * 与后端 game.orchestrator.ts 实际发送的消息保持一致
 */

export interface WSMessage<T = unknown> {
  type: string
  payload: T
  timestamp: number
}

// ═══════════ 客户端 → 服务端 ═══════════

export interface JoinGamePayload {
  gameId: string
}

export interface PlayerSpeechPayload {
  gameId: string
  content: string
}

export interface CastVotePayload {
  gameId: string
  targetSlotIndex: number
}

// ═══════════ 服务端 → 客户端 ═══════════

export interface GameStatePlayer {
  slotIndex: number
  customName: string
  isAI: boolean
  isAlive: boolean
  aiPersona?: string
}

export interface GameStatePayload {
  gameId: string
  status: string
  currentRound: number
  maxRounds: number
  players: GameStatePlayer[]
  currentSpeakerIndex: number
  yourSlotIndex?: number
  yourWord?: string
  yourRole?: string
  speeches?: Array<{ slotIndex: number; content: string; round: number; isAI: boolean; persona?: string; timestamp: number }>
}

export interface GameStartedPayload {
  gameId: string
  currentRound: number
  maxRounds: number
  players: GameStatePlayer[]
}

export interface PhaseChangePayload {
  phase: 'speaking' | 'voting'
  round: number
}

export interface CurrentSpeakerPayload {
  slotIndex: number
  playerName: string
}

export interface RequestSpeechPayload {
  slotIndex: number
  deadline: number
  timeoutSec: number
}

export interface SpeechTimeoutPayload {
  slotIndex: number
  playerName: string
}

export interface AISpeechStartPayload {
  slotIndex: number
}

export interface AISpeechChunkPayload {
  slotIndex: number
  chunk: string
}

export interface AISpeechEndPayload {
  slotIndex: number
  playerName: string
  content: string
}

export interface PlayerSpeechBroadcastPayload {
  slotIndex: number
  playerName: string
  content: string
}

export interface CurrentVoterPayload {
  slotIndex: number
  playerName: string
}

export interface VoteCandidate {
  slotIndex: number
  playerName: string
}

export interface RequestVotePayload {
  slotIndex: number
  candidates: VoteCandidate[]
  deadline: number
  timeoutSec: number
}

export interface VoteCastPayload {
  voterSlot: number
  voterName: string
  targetSlot: number
  targetName: string
}

export interface VoteTimeoutPayload {
  slotIndex: number
  playerName: string
  votedFor: number
}

export interface PlayerEliminatedPayload {
  slotIndex: number
  playerName: string
  wasUndercover: boolean
}

export interface EliminationTiePayload {
  message: string
}

export interface NextRoundPayload {
  round: number
}

export interface GameOverPlayer {
  slotIndex: number
  customName: string
  role: string
  isAlive: boolean
}

export interface GameOverPayload {
  winner: 'civilian' | 'undercover'
  civilianWord: string
  undercoverWord: string
  undercoverSlotIndex: number
  totalRounds: number
  newAchievements?: Array<{ id: string; name: string; icon: string }>
  players: GameOverPlayer[]
}

export interface GameErrorPayload {
  message: string
}

export interface ErrorPayload {
  message: string
}
