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
import { mysqlTable, varchar, int, text, boolean, datetime } from 'drizzle-orm/mysql-core'
import { gameRounds } from './game_rounds'

export const gameSpeeches = mysqlTable('game_speeches', {
  id: varchar('id', { length: 36 }).primaryKey(),
  roundId: varchar('round_id', { length: 36 }).notNull().references(() => gameRounds.id),
  slotIndex: int('slot_index').notNull(),
  content: text('content').notNull(),
  persona: varchar('persona', { length: 64 }),
  isAiGenerated: boolean('is_ai_generated').notNull().default(false),
  createdAt: datetime('created_at').notNull(),
})
