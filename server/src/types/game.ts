export type GameStatus =
  | 'waiting'
  | 'role_assign'
  | 'speaking'
  | 'voting'
  | 'result'
  | 'finished'

export type GamePhase = 'speaking' | 'voting'

export type PlayerRole = 'civilian' | 'undercover'

export type PlayerType = 'human' | 'ai' | 'empty'

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
  userId?: string
  isAlive: boolean
  role?: PlayerRole
  word?: string
  aiPersona?: AIPersona
  isCurrentSpeaker: boolean
  hasSpokenThisRound: boolean
  hasVotedThisRound: boolean
  isTakeoverAI?: boolean   // 玩家断线后被 AI 托管，全程用降级行为不调 Dify
}

export interface Speech {
  slotIndex: number
  content: string
  round: number
  persona?: AIPersona
  isAI: boolean
  timestamp: number
}

export interface VoteRecord {
  voterSlot: number
  targetSlot: number
  timestamp: number
}

export interface GameSettings {
  civilianWord: string
  undercoverWord: string
  ttsEnabled: boolean
  maxRounds: number
}
