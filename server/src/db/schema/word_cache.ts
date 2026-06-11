/**
 * word_cache.ts — 词语缓存池表 Drizzle Schema
 *
 * 职责: 预生成词语对缓存，降低 Dify 调用成本
 *
 * 字段:
 *   id              UUID 主键
 *   civilianWord    平民词
 *   undercoverWord  卧底词
 *   theme           主题分类
 *   difficulty      难度 1-3
 *   usageCount      已使用次数
 *   isActive        是否可用
 *   createdAt       创建时间
 */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const wordCache = sqliteTable('word_cache', {
  id: text('id').primaryKey(),
  civilianWord: text('civilian_word').notNull(),
  undercoverWord: text('undercover_word').notNull(),
  theme: text('theme').default(''),
  difficulty: integer('difficulty').notNull().default(1),
  usageCount: integer('usage_count').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
})
