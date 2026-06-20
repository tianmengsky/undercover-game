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
import { mysqlTable, varchar, int, text, datetime } from 'drizzle-orm/mysql-core'
import { gameRecords } from './game_records'

export const gameRounds = mysqlTable('game_rounds', {
  id: varchar('id', { length: 36 }).primaryKey(),
  gameId: varchar('game_id', { length: 36 }).notNull().references(() => gameRecords.id),
  roundNumber: int('round_number').notNull(),
  phaseOrder: text('phase_order').notNull(), // JSON string
  eliminatedSlot: int('eliminated_slot'),
  createdAt: datetime('created_at').notNull(),
})
