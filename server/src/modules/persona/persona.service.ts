/**
 * persona.service.ts — AI 人设工坊服务
 *
 * 存储: SQLite（Drizzle ORM + raw helpers）
 */
import crypto from 'node:crypto'
import { eq, desc } from 'drizzle-orm'
import { db, togglePersonaLike, incrementPersonaUsage, checkPersonaMonthlyLimit, incPersonaMonthlyLimit } from '../../db/index.js'
import { personas } from '../../db/schema/personas.js'

// ═══════════════════════════════════
// 模板: 关键词 → System Prompt + Voice
// ═══════════════════════════════════

interface Template {
  keywords: string[]
  nameGen: string
  prompt: string
  voicePitch: number
  voiceRate: number
}

const TEMPLATES: Template[] = [
  { keywords: ['教授', '古诗词', '文绉绉', '之乎者也', '学者', '老师'], nameGen: '古诗词教授', prompt: '你是一位博学的老教授，说话文绉绉的，喜欢引用古诗词来表达观点。描述时常用比喻和典故，语气儒雅但不做作。偶尔会加上"依老夫之见"、"此物颇有...之风韵"。', voicePitch: 95, voiceRate: 130 },
  { keywords: ['笑话', '幽默', '搞笑', '逗比', '段子', '梗'], nameGen: '段子手', prompt: '你是一个幽默达人，喜欢用笑话和段子来描述事物。说话风格夸张搞笑，经常自嘲。描述时用特别离谱的比喻。', voicePitch: 120, voiceRate: 170 },
  { keywords: ['毒舌', '犀利', '尖锐', '讽刺', '刻薄'], nameGen: '毒舌点评家', prompt: '你是一个言辞犀利、一针见血的评论家。说话带点刻薄但恰到好处，喜欢用"讲真"、"不是我说"开头。', voicePitch: 100, voiceRate: 155 },
  { keywords: ['胆小', '害怕', '紧张', '结巴', '懦弱', '怂'], nameGen: '胆小鬼', prompt: '你是一个极其胆小的玩家，非常害怕被人发现。说话时经常结巴（用省略号表示停顿），喜欢突然转换话题。', voicePitch: 115, voiceRate: 120 },
  { keywords: ['侦探', '推理', '逻辑', '分析', '线索', '证据'], nameGen: '推理侦探', prompt: '你是一位思维缜密的侦探，习惯用逻辑分析一切。描述时从多个角度拆解特征，像在分析案情。', voicePitch: 105, voiceRate: 160 },
  { keywords: ['文艺', '诗意', '浪漫', '温柔', '抒情', '唯美'], nameGen: '文艺青年', prompt: '你是一个充满诗意的文艺青年，用优美的语言描述世界。喜欢用比喻和通感，把平凡事物描述得如诗如画。', voicePitch: 95, voiceRate: 130 },
  { keywords: ['暴躁', '冲动', '急性子', '不耐烦', '暴脾气', '粗鲁'], nameGen: '暴脾气', prompt: '你是一个脾气火爆、说话直来直去的人。不耐烦兜圈子，描述时语气冲但不带恶意。', voicePitch: 80, voiceRate: 180 },
  { keywords: ['萌新', '小白', '新手', '不懂', '菜鸟', '初学者'], nameGen: '萌新小白', prompt: '你是一个游戏新手，对很多东西都不太懂。说话天真懵懂，偶尔会跑题。常用"感觉像..."、"好像是...吧"。', voicePitch: 110, voiceRate: 135 },
  { keywords: ['冷酷', '高冷', '沉默', '寡言', '冷峻', '严肃'], nameGen: '高冷男神', prompt: '你是一个话少但精的人，惜字如金。从不废话，每个字都有分量。描述时极其简洁精准。', voicePitch: 85, voiceRate: 120 },
  { keywords: ['可爱', '萌', '甜美', '撒娇', '元气', '活泼'], nameGen: '元气少女', prompt: '你是一个元气满满的可爱少女，说话带着萌萌的语气。喜欢用叠词和语气词，描述时充满热情和想象力。', voicePitch: 125, voiceRate: 170 },
]

const DEFAULT_VOICE = { voicePitch: 100, voiceRate: 140 }

// ═══════════════════════════════════
// 生成 System Prompt + Voice（根据描述关键词匹配）
// ═══════════════════════════════════

function generateFromDescription(description: string): {
  name: string
  systemPrompt: string
  voicePitch: number
  voiceRate: number
} {
  const lower = description.toLowerCase()
  let bestMatch: Template = TEMPLATES[0]
  let bestScore = 0

  for (const tpl of TEMPLATES) {
    let score = 0
    for (const kw of tpl.keywords) { if (lower.includes(kw)) score++ }
    if (score > bestScore) { bestScore = score; bestMatch = tpl }
  }

  if (bestScore === 0) {
    return {
      name: '自定义角色',
      systemPrompt: `你是一个${description.slice(0, 20)}的人。请按照这个人设风格进行游戏发言。说话时自然体现性格特点，描述词语时不要直接说出词语本身。`,
      ...DEFAULT_VOICE,
    }
  }

  return {
    name: bestMatch.nameGen,
    systemPrompt: bestMatch.prompt,
    voicePitch: bestMatch.voicePitch,
    voiceRate: bestMatch.voiceRate,
  }
}

// ═══════════════════════════════════
// 公开接口
// ═══════════════════════════════════

export { checkPersonaMonthlyLimit as checkMonthlyLimit }

export function createPersona(
  userId: string,
  authorName: string,
  description: string,
  name?: string,
  systemPrompt?: string,
  voiceName?: string,
  voicePitch?: number,
  voiceRate?: number,
  voiceVolume?: number,
) {
  const { allowed } = checkPersonaMonthlyLimit(userId)
  if (!allowed) throw new Error('每月最多创建 3 个人设')

  // 专家模式：用传入的 name/systemPrompt/voice
  // 快速模式：name/systemPrompt/voice 都从关键词匹配自动生成
  const isExpert = !!(name && systemPrompt)
  const generated = generateFromDescription(description)

  const finalName = name || generated.name
  const finalPrompt = systemPrompt || generated.systemPrompt
  const finalVoicePitch = voicePitch ?? generated.voicePitch
  const finalVoiceRate = voiceRate ?? generated.voiceRate
  const finalVoiceVolume = voiceVolume ?? 100

  const id = crypto.randomUUID()
  const now = Date.now()

  db.insert(personas).values({
    id, name: finalName, description,
    systemPrompt: finalPrompt,
    authorId: userId, authorName,
    usageCount: 0, likeCount: 0, isPublic: true, createdAt: now,
    voiceName: voiceName || '',
    voicePitch: finalVoicePitch,
    voiceRate: finalVoiceRate,
    voiceVolume: finalVoiceVolume,
  }).run()

  incPersonaMonthlyLimit(userId)

  return {
    id, name: finalName, description,
    systemPrompt: finalPrompt,
    authorId: userId, authorName,
    usageCount: 0, likeCount: 0, isPublic: true, createdAt: now,
    voiceName: voiceName || '',
    voicePitch: finalVoicePitch,
    voiceRate: finalVoiceRate,
    voiceVolume: finalVoiceVolume,
  }
}

export function getPublicPersonas(sort: 'popular' | 'new', page: number, pageSize: number) {
  const orderBy = sort === 'popular' ? desc(personas.usageCount) : desc(personas.createdAt)
  const all = db.select().from(personas).where(eq(personas.isPublic, true)).orderBy(orderBy).all()
  const total = all.length
  const start = (page - 1) * pageSize
  return { list: all.slice(start, start + pageSize), total }
}

export function getUserPersonas(userId: string) {
  return db.select().from(personas).where(eq(personas.authorId, userId)).orderBy(desc(personas.createdAt)).all()
}

export function likePersona(personaId: string, userId: string): boolean {
  return togglePersonaLike(personaId, userId)
}

export function getPersona(personaId: string) {
  return db.select().from(personas).where(eq(personas.id, personaId)).get()
}

export function deletePersona(personaId: string, userId: string): boolean {
  const p = db.select().from(personas).where(eq(personas.id, personaId)).get()
  if (!p || p.authorId !== userId) return false
  db.delete(personas).where(eq(personas.id, personaId)).run()
  return true
}

export { incrementPersonaUsage }
