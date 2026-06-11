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
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  nickname: text('nickname').notNull(),
  passwordHash: text('password_hash').notNull(),
  avatarUrl: text('avatar_url').default(''),
  level: integer('level').notNull().default(1),
  exp: integer('exp').notNull().default(0),
  totalGames: integer('total_games').notNull().default(0),
  wins: integer('wins').notNull().default(0),
  mvpCount: integer('mvp_count').notNull().default(0),
  undercoverWins: integer('undercover_wins').notNull().default(0),
  survivalCount: integer('survival_count').notNull().default(0),
  correctVotes: integer('correct_votes').notNull().default(0),
  usedWordsCount: integer('used_words_count').notNull().default(0),
  winStreak: integer('win_streak').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})
