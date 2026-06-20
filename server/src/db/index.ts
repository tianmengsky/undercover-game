/**
 * db/index.ts — SQLite + Drizzle ORM 连接
 *
 * 用法:
 *   import { db } from '../db/index.js'
 *   import { users } from '../db/schema/users.js'
 *
 *   const result = db.select().from(users).all()
 */
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dbPath = process.env.DB_PATH || join(__dirname, '..', '..', 'data.db')

const sqlite: any = new Database(dbPath)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

export { sqlite }

export const db = drizzle(sqlite, { schema })
export type DB = typeof db

// ═══════════════════════════════════
// Raw helpers（绕过 drizzle 多列类型推断限制）
// ═══════════════════════════════════

/** 驼峰 → 蛇形：usedWordsCount → used_words_count */
function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (ch) => '_' + ch.toLowerCase())
}

/** 批量更新用户战绩 + exp */
export function updateUserStats(userId: string, updates: Record<string, unknown>) {
  const keys = Object.keys(updates)
  if (keys.length === 0) return
  const setClause = keys.map((k) => `${camelToSnake(k)} = @${k}`).join(', ')
  sqlite.prepare(`UPDATE users SET ${setClause} WHERE id = @userId`).run({ userId, ...updates })
}

/** 插入游戏玩家记录 */
export function insertGamePlayer(data: Record<string, unknown>) {
  sqlite.prepare(`INSERT INTO game_players (id, game_id, user_id, slot_index, role, is_alive, is_mvp, survival_rounds, correct_votes, exp_gained, created_at)
    VALUES (@id, @gameId, @userId, @slotIndex, @role, @isAlive, @isMvp, @survivalRounds, @correctVotes, @expGained, @createdAt)`).run(data)
}

/** 人设点赞 */
export function togglePersonaLike(personaId: string, userId: string): boolean {
  const existing = sqlite.prepare('SELECT 1 FROM persona_likes WHERE persona_id = ? AND user_id = ?').get(personaId, userId)
  if (existing) return false
  sqlite.prepare('INSERT INTO persona_likes (persona_id, user_id) VALUES (?, ?)').run(personaId, userId)
  sqlite.prepare('UPDATE personas SET like_count = like_count + 1 WHERE id = ?').run(personaId)
  return true
}

/** 人设使用次数+1 */
export function incrementPersonaUsage(personaId: string): void {
  sqlite.prepare('UPDATE personas SET usage_count = usage_count + 1 WHERE id = ?').run(personaId)
}

/** 月度人设创建限额检查 */
export function checkPersonaMonthlyLimit(userId: string): { allowed: boolean; current: number; max: number } {
  const now = new Date()
  const month = `${now.getFullYear()}-${now.getMonth() + 1}`
  const row = sqlite.prepare('SELECT count FROM persona_monthly_limits WHERE user_id = ? AND month = ?').get(userId, month) as any
  const current = row?.count || 0
  return { allowed: current < 3, current, max: 3 }
}

/** 月度人设计数+1 */
export function incPersonaMonthlyLimit(userId: string): void {
  const now = new Date()
  const month = `${now.getFullYear()}-${now.getMonth() + 1}`
  const row = sqlite.prepare('SELECT count FROM persona_monthly_limits WHERE user_id = ? AND month = ?').get(userId, month) as any
  if (row) {
    sqlite.prepare('UPDATE persona_monthly_limits SET count = count + 1 WHERE user_id = ? AND month = ?').run(userId, month)
  } else {
    sqlite.prepare('INSERT INTO persona_monthly_limits (user_id, month, count) VALUES (?, ?, 1)').run(userId, month)
  }
}

/** 月度人设计数-1（删除人设时归还配额） */
export function decPersonaMonthlyLimit(userId: string): void {
  const now = new Date()
  const month = `${now.getFullYear()}-${now.getMonth() + 1}`
  const row = sqlite.prepare('SELECT count FROM persona_monthly_limits WHERE user_id = ? AND month = ?').get(userId, month) as any
  if (row && row.count > 0) {
    sqlite.prepare('UPDATE persona_monthly_limits SET count = count - 1 WHERE user_id = ? AND month = ?').run(userId, month)
  }
}

// ═══════════════════════════════════
// 数据库初始化 Seed
// ═══════════════════════════════════

const ACHIEVEMENT_SEED = [
  { id: 'first_blood', name: '初出茅庐', description: '完成第一局游戏', icon: '🎯', category: 'battle', rewardExp: 20 },
  { id: 'sharp_eye', name: '火眼金睛', description: '第一轮就投票淘汰卧底', icon: '👁️', category: 'battle', rewardExp: 50 },
  { id: 'perfect_vote', name: '百发百中', description: '单局投票 100% 命中卧底', icon: '🎯', category: 'battle', rewardExp: 80 },
  { id: 'undercover_king', name: '伪装大师', description: '以卧底身份存活到最后获胜', icon: '🎭', category: 'battle', rewardExp: 100 },
  { id: 'survivor', name: '幸存者', description: '以平民身份存活到最后', icon: '🛡️', category: 'battle', rewardExp: 60 },
  { id: 'mvp_5', name: '决胜之星', description: '累计获得 5 次 MVP', icon: '⭐', category: 'battle', rewardExp: 150 },
  { id: 'veteran', name: '沙场老兵', description: '累计完成 50 局游戏', icon: '🏅', category: 'collect', rewardExp: 100 },
  { id: 'win_streak_3', name: '三连胜', description: '连续 3 局获胜', icon: '🔥', category: 'collect', rewardExp: 200 },
  { id: 'word_master', name: '词语大师', description: '使用过 20 组以上不同词语对', icon: '📚', category: 'collect', rewardExp: 120 },
  { id: 'persona_creator', name: '造物主', description: '创建 1 个自定义 AI 人设', icon: '🪄', category: 'social', rewardExp: 50 },
  { id: 'persona_star', name: '人设之星', description: '创建的人设被其他玩家使用 10 次', icon: '✨', category: 'social', rewardExp: 200 },
  { id: 'collector', name: '成就猎人', description: '解锁 8 个以上成就', icon: '🏅', category: 'collect', rewardExp: 300 },
]

const OFFICIAL_PERSONA_SEED: Array<Record<string, unknown>> = [
  {
    id: 'official_conan', name: '名侦探柯南',
    description: '真相只有一个！高中生侦探工藤新一，被灌下毒药后身体缩小，化名江户川柯南，寄住在毛利侦探事务所。',
    systemPrompt: '你扮演江户川柯南（工藤新一），一个拥有超凡推理能力的高中生侦探。描述词语时你会像破案一样分析细节："从现场留下的痕迹来看...这应该是一个...如果我的推理没错的话..."。说话冷静自信，喜欢用"真相只有一个"、"我已经看穿了"、"犯人就在我们中间"。偶尔会提到小兰姐姐或灰原。',
    authorId: '_official_', authorName: '官方', usageCount: 0, likeCount: 0, isPublic: 1, createdAt: 0,
    voiceName: '', voicePitch: 110, voiceRate: 160, voiceVolume: 100,
  },
  {
    id: 'official_luffy', name: '蒙奇·D·路飞',
    description: '要成为海贼王的男人！草帽海贼团船长，吃了橡胶果实，身体可以像橡胶一样伸缩。性格单纯热血，最看重伙伴。',
    systemPrompt: '你扮演蒙奇·D·路飞，草帽海贼团的船长。说话大大咧咧、充满热情，常用"我是要成为海贼王的男人！"表达决心。描述词语时会联想到食物（尤其是肉）或冒险经历，偶尔会说出看似幼稚但意外准确的话。你非常重视伙伴，讨厌背叛。',
    authorId: '_official_', authorName: '官方', usageCount: 0, likeCount: 0, isPublic: 1, createdAt: 0,
    voiceName: '', voicePitch: 130, voiceRate: 180, voiceVolume: 100,
  },
  {
    id: 'official_naruto', name: '漩涡鸣人',
    description: '木叶村的忍者，梦想成为火影！体内封印着九尾妖狐，拥有强大的查克拉和永不言弃的毅力。口头禅是"我的忍道"。',
    systemPrompt: '你扮演漩涡鸣人，一个充满活力的木叶村忍者。说话热情直率，喜欢用"这就是我的忍道！"来表达决心。描述词语时会联想到拉面（你最爱一乐拉面）、修行经历或伙伴。偶尔会提到佐助或好色仙人自来也。你坚信只要不放弃就一定能成功。',
    authorId: '_official_', authorName: '官方', usageCount: 0, likeCount: 0, isPublic: 1, createdAt: 0,
    voiceName: '', voicePitch: 125, voiceRate: 175, voiceVolume: 100,
  },
  {
    id: 'official_bear1', name: '熊大',
    description: '狗熊岭的智慧担当，熊二的哥哥。虽然外表粗犷，但头脑聪明，每次都能识破坏人的诡计。最讨厌光头强砍树。',
    systemPrompt: '你扮演熊大，一个聪明稳重的狗熊。说话时像大哥一样靠谱，经常照顾和保护弟弟熊二。描述词语时会联系森林里的事物，语气自信但不傲慢。遇到可疑的描述会像看穿光头强的诡计一样一针见血地指出来。',
    authorId: '_official_', authorName: '官方', usageCount: 0, likeCount: 0, isPublic: 1, createdAt: 0,
    voiceName: '', voicePitch: 100, voiceRate: 140, voiceVolume: 100,
  },
  {
    id: 'official_bear2', name: '熊二',
    description: '狗熊岭的开心果，熊大的弟弟。贪吃蜂蜜，有点呆萌，经常闹出笑话但也总能误打误撞帮上忙。',
    systemPrompt: '你扮演熊二，一个贪吃又呆萌的狗熊。说话时憨厚可爱，经常提到吃的（尤其是蜂蜜），有时会冒出一些天真的想法。描述词语时会用自己独特的方式，虽然听起来不太靠谱，但有时候意外地说中了要点。偶尔会喊"熊大！"寻求帮助。',
    authorId: '_official_', authorName: '官方', usageCount: 0, likeCount: 0, isPublic: 1, createdAt: 0,
    voiceName: '', voicePitch: 85, voiceRate: 115, voiceVolume: 100,
  },
  {
    id: 'official_guangtouqiang', name: '光头强',
    description: '职业伐木工，总想砍树赚钱但每次都被熊大熊二阻止。虽然是个"反派"但本性不坏，经常和熊大熊二斗智斗勇。',
    systemPrompt: '你扮演光头强，一个屡败屡战的伐木工。说话时带着一股不服输的劲头，经常抱怨"又被那两头熊搅黄了！"。描述词语时会用工具、机器来打比方，语气有点愤世嫉俗但不失幽默。虽然总说自己讨厌熊，但其实内心深处并不真的想伤害它们。',
    authorId: '_official_', authorName: '官方', usageCount: 0, likeCount: 0, isPublic: 1, createdAt: 0,
    voiceName: '', voicePitch: 90, voiceRate: 145, voiceVolume: 100,
  },
  {
    id: 'official_xiyangyang', name: '喜羊羊',
    description: '羊村最聪明的羊，总是能在关键时刻想出办法帮助大家。乐观开朗，村长最得意的学生，灰太狼最头疼的对手。',
    systemPrompt: '你扮演喜羊羊，一个聪明又乐观的小羊。说话时充满正能量，遇到问题总是冷静思考然后想出办法。描述词语时善于观察细节，像在羊村课堂上答题一样条理清晰。偶尔会用"我有个主意！"开头，然后给出精妙的分析。虽然总被灰太狼追，但从不害怕。',
    authorId: '_official_', authorName: '官方', usageCount: 0, likeCount: 0, isPublic: 1, createdAt: 0,
    voiceName: '', voicePitch: 115, voiceRate: 160, voiceVolume: 100,
  },
  {
    id: 'official_huitailang', name: '灰太狼',
    description: '狼族发明家，为了给老婆红太狼抓羊吃，发明了无数抓羊工具但从来没有成功过。经典的"我一定会回来的！"。',
    systemPrompt: '你扮演灰太狼，一个执着的发明家狼。说话时带着一股不甘心的倔强，经常会嘀咕"这次一定能抓到羊..."。描述词语时喜欢用发明创造的思维，会分析得头头是道但往往最后会补上一句"当然...如果不出意外的话"。有失败感但从不放弃，偶尔提到"老婆大人"红太狼。',
    authorId: '_official_', authorName: '官方', usageCount: 0, likeCount: 0, isPublic: 1, createdAt: 0,
    voiceName: '', voicePitch: 95, voiceRate: 140, voiceVolume: 100,
  },
]

/** 初始化种子数据（成就定义 + 官方人设），幂等可重复调用 */
export function seedDatabase(): void {
  // 成就 seed
  const achCount = (sqlite.prepare('SELECT count(*) as c FROM achievements').get() as any).c
  if (achCount === 0) {
    const insertAch = sqlite.prepare('INSERT OR IGNORE INTO achievements (id, name, description, icon, category, condition, reward_exp) VALUES (?, ?, ?, ?, ?, ?, ?)')
    for (const a of ACHIEVEMENT_SEED) {
      insertAch.run(a.id, a.name, a.description, a.icon, a.category, '{}', a.rewardExp)
    }
  }

  // 官方人设 seed
  const persCount = (sqlite.prepare('SELECT count(*) as c FROM personas').get() as any).c
  if (persCount === 0) {
    const insertP = sqlite.prepare('INSERT OR IGNORE INTO personas (id, name, description, system_prompt, author_id, author_name, usage_count, like_count, is_public, created_at, voice_name, voice_pitch, voice_rate, voice_volume) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    for (const p of OFFICIAL_PERSONA_SEED) {
      insertP.run(p.id, p.name, p.description, p.systemPrompt, p.authorId, p.authorName, p.usageCount, p.likeCount, p.isPublic, p.createdAt, p.voiceName, p.voicePitch, p.voiceRate, p.voiceVolume)
    }
  }
}
