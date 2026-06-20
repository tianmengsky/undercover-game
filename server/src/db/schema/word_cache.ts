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
import { mysqlTable, varchar, int, boolean, datetime } from 'drizzle-orm/mysql-core'

export const wordCache = mysqlTable('word_cache', {
  id: varchar('id', { length: 36 }).primaryKey(),
  civilianWord: varchar('civilian_word', { length: 128 }).notNull(),
  undercoverWord: varchar('undercover_word', { length: 128 }).notNull(),
  theme: varchar('theme', { length: 64 }).default(''),
  difficulty: int('difficulty').notNull().default(1),
  usageCount: int('usage_count').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: datetime('created_at').notNull(),
})
