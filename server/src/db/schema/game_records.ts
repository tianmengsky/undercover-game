/**
 * game_records.ts — 对局记录表 Drizzle Schema
 *
 * 字段:
 *   id              UUID 主键
 *   civilianWord    平民词
 *   undercoverWord  卧底词
 *   winner          胜方 'civilian' | 'undercover'
 *   totalRounds     总局数
 *   createdAt       创建时间
 *   finishedAt      结束时间
 *
 * 关系: 1:N → game_players / game_rounds
 */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const gameRecords = sqliteTable('game_records', {
  id: text('id').primaryKey(),
  civilianWord: text('civilian_word').notNull(),
  undercoverWord: text('undercover_word').notNull(),
  winner: text('winner').notNull(), // 'civilian' | 'undercover'
  totalRounds: integer('total_rounds').notNull(),
  createdAt: text('created_at').notNull(),
  finishedAt: text('finished_at').notNull(),
})
