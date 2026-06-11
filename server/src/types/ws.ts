export interface WSMessage<T = unknown> {
  type: string
  payload: T
  timestamp: number
}

/** 客户端 → 服务端 */
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

export interface ToggleTTSPayload {
  enabled: boolean
}

/** 服务端 → 客户端 */
export interface GameStatePayload {
  gameId: string
  status: string
  currentRound: number
  maxRounds: number
  players: Array<Record<string, unknown>>
  yourSlotIndex: number
  yourWord?: string
  yourRole?: string
  currentSpeakerIndex: number
}

export interface SpeechTurnPayload {
  slotIndex: number
  customName: string
  isAI: boolean
  persona?: string
  deadline: number
}

export interface AISpeechChunkPayload {
  slotIndex: number
  chunk: string
  isLast: boolean
}

export interface VoteStartPayload {
  candidates: Array<{ slotIndex: number; customName: string }>
  deadline: number
}

export interface EliminationPayload {
  eliminatedSlotIndex: number
  customName: string
  role: string
  voteCount: number
}

export interface GameOverPayload {
  winner: string
  civilianWord: string
  undercoverWord: string
  totalRounds: number
  reason: string
  players: Array<{
    slotIndex: number
    customName: string
    role: string
    isAlive: boolean
    isMvp: boolean
    expGained: number
  }>
}
