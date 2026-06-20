/**
 * users.ts — 用户表 Drizzle Schema
 *
 * 字段:
 *   id            UUID 主键
 *   username      登录名（唯一）
 *   nickname      显示昵称
 *   passwordHash  bcrypt 哈希
 *   avatarUrl     头像 URL（emoji 回退）
 *   level         等级（calcLevel 公式计算）
 *   exp           经验值（游戏结算 + 成就奖励）
 *   totalGames    总局数
 *   wins          胜场
 *   mvpCount      MVP 次数
 *   createdAt     注册时间
 *   updatedAt     最后更新时间
 *
 * 关系: 被 game_players.user_id / user_achievements.user_id 引用
 */
import { mysqlTable, varchar, int, datetime } from 'drizzle-orm/mysql-core'

export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  nickname: varchar('nickname', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  avatarUrl: varchar('avatar_url', { length: 255 }).default(''),
  level: int('level').notNull().default(1),
  exp: int('exp').notNull().default(0),
  totalGames: int('total_games').notNull().default(0),
  wins: int('wins').notNull().default(0),
  mvpCount: int('mvp_count').notNull().default(0),
  undercoverWins: int('undercover_wins').notNull().default(0),
  survivalCount: int('survival_count').notNull().default(0),
  correctVotes: int('correct_votes').notNull().default(0),
  usedWordsCount: int('used_words_count').notNull().default(0),
  winStreak: int('win_streak').notNull().default(0),
  createdAt: datetime('created_at').notNull(),
  updatedAt: datetime('updated_at').notNull(),
})
