/**
 * achievements.ts — 成就系统表 Drizzle Schema
 *
 * achievements        成就定义表（12 个预设成就的静态数据）
 * user_achievements   用户成就关联表
 *
 * 关系: user_id → users, achievement_id → achievements, game_id → game_records
 */
import { mysqlTable, varchar, int, text } from 'drizzle-orm/mysql-core'
import { users } from './users'
import { gameRecords } from './game_records'

// 成就定义表（12 个预设成就的静态数据）
export const achievements = mysqlTable('achievements', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 255 }).notNull(),
  icon: varchar('icon', { length: 16 }).notNull(),
  category: varchar('category', { length: 32 }).notNull(), // 'battle' | 'collect' | 'social'
  condition: text('condition').notNull(), // JSON string
  rewardExp: int('reward_exp').notNull().default(0),
})

// 用户成就关联表
export const userAchievements = mysqlTable('user_achievements', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id),
  achievementId: varchar('achievement_id', { length: 36 }).notNull().references(() => achievements.id),
  gameId: varchar('game_id', { length: 36 }), // nullable — 人设成就对局无关
  unlockedAt: varchar('unlocked_at', { length: 32 }).notNull(),
})
