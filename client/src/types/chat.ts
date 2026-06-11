/**
 * chat.ts - 发言/消息相关类型
 */
import type { Speech } from './game'

export interface ChatMessage {
  type: 'ai_speech' | 'player_speech' | 'system'
  speech: Speech
  playerName: string
}
