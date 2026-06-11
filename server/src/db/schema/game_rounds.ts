/**
 * game_rounds.ts — 游戏轮次表 Drizzle Schema
 *
 * 字段:
 *   id              UUID 主键
 *   gameId          FK → game_records.id
 *   roundNumber     第几轮
 *   phaseOrder      阶段序列 JSON string
 *   eliminatedSlot  本轮淘汰的座位号（nullable）
 *   createdAt       创建时间
 *
 * 关系: 1:N → game_speeches
 */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { gameRecords } from './game_records'

export const gameRounds = sqliteTable('game_rounds', {
  id: text('id').primaryKey(),
  gameId: text('game_id').notNull().references(() => gameRecords.id),
  roundNumber: integer('round_number').notNull(),
  phaseOrder: text('phase_order').notNull().default('[]'), // JSON string
  eliminatedSlot: integer('eliminated_slot'),
  createdAt: text('created_at').notNull(),
})
