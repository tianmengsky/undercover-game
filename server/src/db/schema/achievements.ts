/**
 * achievements.ts — 成就系统表 Drizzle Schema
 *
 * achievements        成就定义表（12 个预设成就的静态数据）
 * user_achievements   用户成就关联表
 *
 * 关系: user_id → users, achievement_id → achievements, game_id → game_records
 */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { users } from './users'
import { gameRecords } from './game_records'

// 成就定义表（12 个预设成就的静态数据）
export const achievements = sqliteTable('achievements', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  icon: text('icon').notNull(),
  category: text('category').notNull(), // 'battle' | 'collect' | 'social'
  condition: text('condition').notNull().default('{}'), // JSON string
  rewardExp: integer('reward_exp').notNull().default(0),
})

// 用户成就关联表
export const userAchievements = sqliteTable('user_achievements', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  achievementId: text('achievement_id').notNull().references(() => achievements.id),
  gameId: text('game_id'), // nullable — 人设成就对局无关
  unlockedAt: text('unlocked_at').notNull(),
})
