import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

// 人设表
export const personas = sqliteTable('personas', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  systemPrompt: text('system_prompt').notNull(),
  authorId: text('author_id').notNull(),
  authorName: text('author_name').notNull(),
  usageCount: integer('usage_count').notNull().default(0),
  likeCount: integer('like_count').notNull().default(0),
  isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull(),
  voiceName: text('voice_name').default(''),
  voicePitch: integer('voice_pitch').notNull().default(100),   // 0.5~2.0 → 存为 *100 的整数
  voiceRate: integer('voice_rate').notNull().default(100),
  voiceVolume: integer('voice_volume').notNull().default(100),
})

// 人设点赞记录（防重复点赞）
export const personaLikes = sqliteTable('persona_likes', {
  personaId: text('persona_id').notNull().references(() => personas.id),
  userId: text('user_id').notNull(),
})

// 月度人设创建限额
export const personaMonthlyLimits = sqliteTable('persona_monthly_limits', {
  userId: text('user_id').notNull(),
  month: text('month').notNull(),   // 'YYYY-MM'
  count: integer('count').notNull().default(0),
})
