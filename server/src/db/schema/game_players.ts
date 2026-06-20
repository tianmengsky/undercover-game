/**
 * game_players.ts — 对局-玩家关联表 Drizzle Schema
 *
 * 字段:
 *   id              UUID 主键
 *   gameId          FK → game_records.id
 *   userId          FK → users.id（人类玩家, nullable）
 *   aiPersona       AI 人设 ID（AI 玩家）
 *   slotIndex       座位号 0-5
 *   role            'civilian' | 'undercover'
 *   isAlive         最终是否存活
 *   isMvp           是否 MVP
 *   survivalRounds  存活轮数
 *   correctVotes    投票正确次数
 *   expGained       获得经验
 *   createdAt       创建时间
 */
import { mysqlTable, varchar, int, boolean, datetime } from 'drizzle-orm/mysql-core'
import { gameRecords } from './game_records'
import { users } from './users'

export const gamePlayers = mysqlTable('game_players', {
  id: varchar('id', { length: 36 }).primaryKey(),
  gameId: varchar('game_id', { length: 36 }).notNull().references(() => gameRecords.id),
  userId: varchar('user_id', { length: 36 }),
  aiPersona: varchar('ai_persona', { length: 64 }),
  slotIndex: int('slot_index').notNull(),
  role: varchar('role', { length: 32 }).notNull(), // 'civilian' | 'undercover'
  isAlive: boolean('is_alive').notNull(),
  isMvp: boolean('is_mvp').notNull().default(false),
  survivalRounds: int('survival_rounds').notNull().default(0),
  correctVotes: int('correct_votes').notNull().default(0),
  expGained: int('exp_gained').notNull().default(0),
  createdAt: datetime('created_at').notNull(),
})
