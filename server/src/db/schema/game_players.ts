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
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { gameRecords } from './game_records'
import { users } from './users'

export const gamePlayers = sqliteTable('game_players', {
  id: text('id').primaryKey(),
  gameId: text('game_id').notNull().references(() => gameRecords.id),
  userId: text('user_id'),
  aiPersona: text('ai_persona'),
  slotIndex: integer('slot_index').notNull(),
  role: text('role').notNull(), // 'civilian' | 'undercover'
  isAlive: integer('is_alive', { mode: 'boolean' }).notNull(),
  isMvp: integer('is_mvp', { mode: 'boolean' }).notNull().default(false),
  survivalRounds: integer('survival_rounds').notNull().default(0),
  correctVotes: integer('correct_votes').notNull().default(0),
  expGained: integer('exp_gained').notNull().default(0),
  createdAt: text('created_at').notNull(),
})
