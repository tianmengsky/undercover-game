/**
 * game_speeches.ts — 发言记录表 Drizzle Schema
 *
 * 字段:
 *   id              UUID 主键
 *   roundId         FK → game_rounds.id
 *   slotIndex       发言者座位号
 *   content         发言内容
 *   persona         AI 人设标签（nullable）
 *   isAiGenerated   是否 AI 生成
 *   createdAt       创建时间
 */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { gameRounds } from './game_rounds'

export const gameSpeeches = sqliteTable('game_speeches', {
  id: text('id').primaryKey(),
  roundId: text('round_id').notNull().references(() => gameRounds.id),
  slotIndex: integer('slot_index').notNull(),
  content: text('content').notNull(),
  persona: text('persona'),
  isAiGenerated: integer('is_ai_generated', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
})
