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
import { mysqlTable, varchar, int, datetime } from 'drizzle-orm/mysql-core'

export const gameRecords = mysqlTable('game_records', {
  id: varchar('id', { length: 36 }).primaryKey(),
  civilianWord: varchar('civilian_word', { length: 128 }).notNull(),
  undercoverWord: varchar('undercover_word', { length: 128 }).notNull(),
  winner: varchar('winner', { length: 32 }).notNull(), // 'civilian' | 'undercover'
  totalRounds: int('total_rounds').notNull(),
  createdAt: datetime('created_at').notNull(),
  finishedAt: datetime('finished_at').notNull(),
})
