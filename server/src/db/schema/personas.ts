import { mysqlTable, varchar, int, boolean, text, bigint } from 'drizzle-orm/mysql-core'

// 人设表
export const personas = mysqlTable('personas', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').notNull(),
  systemPrompt: text('system_prompt').notNull(),
  authorId: varchar('author_id', { length: 36 }).notNull(),
  authorName: varchar('author_name', { length: 255 }).notNull(),
  usageCount: int('usage_count').notNull().default(0),
  likeCount: int('like_count').notNull().default(0),
  isPublic: boolean('is_public').notNull().default(true),
  createdAt: bigint('created_at', { mode: 'number', unsigned: true }).notNull(),
  voiceName: varchar('voice_name', { length: 64 }).default(''),
  voicePitch: int('voice_pitch').notNull().default(100),
  voiceRate: int('voice_rate').notNull().default(100),
  voiceVolume: int('voice_volume').notNull().default(100),
})

// 人设点赞记录（防重复点赞）
export const personaLikes = mysqlTable('persona_likes', {
  personaId: varchar('persona_id', { length: 36 }).notNull().references(() => personas.id),
  userId: varchar('user_id', { length: 36 }).notNull(),
})

// 月度人设创建限额
export const personaMonthlyLimits = mysqlTable('persona_monthly_limits', {
  userId: varchar('user_id', { length: 36 }).notNull(),
  month: varchar('month', { length: 16 }).notNull(), // 'YYYY-MM'
  count: int('count').notNull().default(0),
})
