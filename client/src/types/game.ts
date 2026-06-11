/**
 * game.ts - 游戏核心类型定义
 *
 * 与后端 types/game.ts 保持同步
 */
export type GameStatus =
  | 'waiting'
  | 'role_assign'
  | 'speaking'
  | 'voting'
  | 'result'
  | 'finished'

export type PlayerRole = 'civilian' | 'undercover'
export type PlayerType = 'human' | 'ai'

export type AIPersona =
  | 'default'
  | 'humor'
  | 'logic'
  | 'newbie'
  | 'literary'
  | 'grumpy'

export interface Player {
  slotIndex: number
  customName: string
  type: PlayerType
  isAlive: boolean
  role?: PlayerRole
  word?: string
  aiPersona?: AIPersona
  isCurrentSpeaker: boolean
  hasSpokenThisRound: boolean
  hasVotedThisRound: boolean
}

export interface GameState {
  gameId: string
  status: GameStatus
  currentRound: number
  maxRounds: number
  players: Player[]
  undercoverSlotIndex: number
  civilianWord: string
  undercoverWord: string
  eliminatedPlayers: number[]
  winner: 'civilian' | 'undercover' | null
}

export interface VoteRecord {
  voterSlot: number
  targetSlot: number
  timestamp: number
}

export interface Speech {
  slotIndex: number
  content: string
  round: number
  persona?: AIPersona
  isAI: boolean
  timestamp: number
  _typingContent?: string
}
