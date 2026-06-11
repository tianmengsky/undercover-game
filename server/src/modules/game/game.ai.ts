/**
 * game.ai.ts - Dify AI 调用模块（单一智能体方案）
 *
 * 1 个 Dify 应用，通过 inputs.type 分支：
 *   "词语生成" → 知识检索 + LLM → 输出 JSON
 *   "语义描述" → LLM → 流式输出发言
 *   "投票"     → LLM → 输出玩家昵称
 */
import { getEnv } from '../../config/env.js'
import { getPersona } from '../persona/persona.service.js'

const env = getEnv()
const DIFY_URL = `${env.DIFY_BASE_URL}/chat-messages`
const API_KEY = env.DIFY_API_KEY

// ═══════════════════════════════════
// 人设中文描述映射
// ═══════════════════════════════════
const PERSONA_MAP: Record<string, string> = {
  default: '你是一个普通的游戏玩家，说话自然随和',
  humor: '你是一个幽默达人，说话喜欢用段子和搞笑的方式表达',
  logic: '你是一个逻辑严谨的程序员，喜欢用理性的方式分析问题，说话简洁直接',
  newbie: '你是一个萌新小白，天真懵懂，说话模糊不太确定，偶尔跑题',
  literary: '你是一个文艺青年，说话充满诗意，喜欢用比喻和优美的词句',
  grumpy: '你是一个暴躁老哥，说话不耐烦、直接带刺，但其实在认真玩游戏',
}

/**
 * 解析人设描述
 * 内置人设直接用 PERSONA_MAP，自定义人设从 personaService 查 systemPrompt
 */
function resolvePersona(personaId: string): string {
  if (PERSONA_MAP[personaId]) return PERSONA_MAP[personaId]
  // 可能是 UUID 格式的自定义人设
  const custom = getPersona(personaId)
  return custom?.systemPrompt || PERSONA_MAP.default
}

// ═══════════════════════════════════
// 发言降级模板池
// ═══════════════════════════════════
const SPEECH_FALLBACKS: Record<string, string[]> = {
  default: [
    '嗯，让我想想……这个应该是一种常见的东西，大家应该都见过',
    '我觉得这个还挺好描述的，就是日常生活中经常能遇到的',
    '这个东西吧，怎么说呢，挺普遍的，大多数人都知道',
  ],
  humor: [
    '哈哈，这东西简直就是为快乐而生的！谁不喜欢呢？',
    '我一看见它就控制不住自己，太好笑了哈哈哈',
    '你们肯定都知道的，那种让人忍不住嘴角上扬的存在',
  ],
  logic: [
    '从逻辑角度分析，这个对象的核心特征可以归纳为两个维度：形态和功能',
    '根据已知信息推断，这个事物属于常见类别，具有可观测的物理属性',
    '在此做一次归纳推理：该对象在日常场景中出现频率极高，且具有独特标识',
  ],
  newbie: [
    '啊？这个……呃……就是……那个……怎么说呢……',
    '我好像知道是什么，但又不太确定……应该是一种东西吧？',
    '嗯……我觉得吧，可能是……算了你们先说吧',
  ],
  literary: [
    '它是生活中那抹不经意的美好，是平淡日子里的小确幸',
    '如果非要用一句话来形容它，那就是平凡中的不平凡',
    '它静默地存在着，却承载了无数人的日常与回忆',
  ],
  grumpy: [
    '啧，这不就是那啥吗，有啥好遮遮掩掩的',
    '行吧，我就直说了，这东西谁不认识啊，至于想半天吗',
    '烦死了，非要我描述，行行行，你们开心就好',
  ],
}

// ═══════════════════════════════════
// 工具函数
// ═══════════════════════════════════

/**
 * 从 Dify 返回的 answer 中提取纯净内容
 * 兼容：<think> 思考标签、Markdown 代码块、混入文字
 */
function extractAnswer(answer: string): string {
  if (!answer?.trim()) return ''

  let text = answer.trim()

  // 去掉 <think>...</think> 标签（推理模型的思考过程）
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()

  return text
}

/**
 * 从 AI 返回中提取 JSON
 * 兼容三种格式：
 * 1. Markdown 代码块：```json { ... } ```
 * 2. 混入思考文字：找到第一个 { 到最后一个 }
 * 3. 纯净 JSON：直接返回
 */
function extractJsonFromAnswer(answer: string): string {
  if (!answer?.trim()) return ''

  let text = extractAnswer(answer)
  if (!text) return ''

  // 场景 1：Markdown 代码块包裹
  if (text.startsWith('```')) {
    const endIndex = text.lastIndexOf('```')
    if (endIndex > 3) {
      text = text.substring(3, endIndex).trim()
      if (text.toLowerCase().startsWith('json')) {
        text = text.substring(4).trim()
      }
    }
  }

  // 场景 2：找到第一个 { 和最后一个 }
  const jsonStart = text.indexOf('{')
  const jsonEnd = text.lastIndexOf('}')
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    return text.substring(jsonStart, jsonEnd + 1)
  }

  return text
}

/**
 * 流式场景下跨 chunk 去除 <think>...</think> 思考标签，同时收集 think 内容
 * state.inside 追踪是否正在 think 块内部，跨多次调用保持状态
 * captured 接收被去除的 think 内容（累积追加）
 */
function stripThinkChunk(input: string, state: { inside: boolean }, captured?: string[]): string {
  let result = ''
  let i = 0
  while (i < input.length) {
    if (!state.inside) {
      const start = input.indexOf('<think>', i)
      if (start === -1) {
        result += input.slice(i)
        break
      }
      result += input.slice(i, start)
      state.inside = true
      i = start + '<think>'.length
    } else {
      const end = input.indexOf('</think>', i)
      if (end === -1) {
        // 等待下一个 chunk
        if (captured) captured.push(input.slice(i))
        break
      }
      if (captured) captured.push(input.slice(i, end))
      state.inside = false
      i = end + '</think>'.length
    }
  }
  return result
}

// ═══════════════════════════════════
// Dify API 调用基础方法
// ═══════════════════════════════════

interface DifyRequest {
  inputs: Record<string, string>
  query: string
  response_mode: 'blocking' | 'streaming'
  conversation_id: string
  user: string
}

function buildHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  }
}

function buildRequest(
  type: string,
  query: string,
  mode: 'blocking' | 'streaming',
  extraInputs: Record<string, string> = {},
): DifyRequest {
  return {
    inputs: { type, ...extraInputs },
    query,
    response_mode: mode,
    conversation_id: '',
    user: 'abc-123',
  }
}

async function callDifyBlocking(
  type: string,
  query: string,
  extraInputs: Record<string, string> = {},
): Promise<string> {
  const body = buildRequest(type, query, 'blocking', extraInputs)

  const res = await fetch(DIFY_URL, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`Dify API ${res.status}: ${await res.text().catch(() => '')}`)
  }

  const data = (await res.json()) as { answer?: string }
  return data.answer ?? ''
}

// ═══════════════════════════════════
// 公开 API
// ═══════════════════════════════════

/** 词语类型，每次随机选一个与难度组合，让向量检索命中不同子集 */
const WORD_CATEGORIES = [
  '食物', '服饰', '家居', '交通', '文具',
  '动植物', '艺术', '运动', '科技', '建筑',
  '饮品', '日用', '自然', '其他',
]

/**
 * 生成词语对（RAG 知识库 + LLM 随机选择）
 *
 * 向量检索 Top-K=10 固定，只用难度会导致每次都命中相同的 10 对。
 * 解决：每次随机选一个类型标签与难度组合（如 "适中 食物"），
 * 不同标签改变查询向量 → 每次检索命中的 10 对子集不同。
 *
 * @param difficulty 难度："入门" | "简单" | "适中" | "稍难" | "困难" | "超难"
 */
export async function generateWordPair(
  difficulty: string = '适中',
): Promise<{ commonWord: string; undercoverWord: string; difficulty: string }> {
  if (!API_KEY) {
    return { commonWord: '苹果', undercoverWord: '梨子', difficulty }
  }

  const category = WORD_CATEGORIES[Math.floor(Math.random() * WORD_CATEGORIES.length)]
  const query = `${difficulty} ${category}`

  const answer = await callDifyBlocking('词语生成', query, { difficulty, category })
  const json = extractJsonFromAnswer(answer)
  const parsed = JSON.parse(json)

  return {
    commonWord: parsed.common_word || '苹果',
    undercoverWord: parsed.undercover_word || '梨子',
    difficulty: parsed.difficulty || difficulty,
  }
}

/**
 * AI 发言（流式输出）
 *
 * @param personaId 人设 ID（如 'logic'、'humor' 等）
 * @param word AI 拿到的词语
 * @param slotIndex 当前 AI 的座位号
 * @param history 已发言玩家的发言内容（格式化字符串）
 * @param round 当前轮次
 * @param alivePlayers 存活玩家信息（用于构造 friends 关系）
 */
export async function* generateSpeech(
  personaId: string,
  word: string,
  slotIndex: number,
  history: string,
  round: number,
  alivePlayers: Array<{ slotIndex: number; name: string }>,
  capturedThink?: { text: string },
): AsyncGenerator<string> {
  if (capturedThink) capturedThink.text = ''
  const personaDesc = resolvePersona(personaId)
  const friendsDesc = alivePlayers
    .filter((p) => p.slotIndex !== slotIndex)
    .map((p) => `玩家${p.name}`)
    .join('、')

  if (!API_KEY) {
    // 无 Dify 时用模板
    const pool = SPEECH_FALLBACKS[personaId] || SPEECH_FALLBACKS.default
    yield pool[Math.floor(Math.random() * pool.length)]
    return
  }

  const body = buildRequest('语义描述', history, 'streaming', {
    currentWord: word,
    friends: friendsDesc,
    personality: personaDesc,
  })

  let timedOut = false
  const controller = new AbortController()
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, 15_000)

  const thinkChunks: string[] = []     // 收集被去除的 think 内容

  try {
    const res = await fetch(DIFY_URL, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!res.ok || !res.body) {
      timedOut = true
      throw new Error(`Dify ${res.status}`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    const thinkState = { inside: false } // 跨 chunk 追踪 <think> 标签

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (!data) continue

        try {
          const parsed = JSON.parse(data)
          if (parsed.event === 'message' && parsed.answer) {
            // 跨 chunk 去除 <think>...</think> 内容，同时收集到 thinkChunks
            const cleaned = stripThinkChunk(parsed.answer, thinkState, thinkChunks)
            if (cleaned) yield cleaned
          }
          if (parsed.event === 'error') {
            timedOut = true
            break
          }
        } catch {
          // SSE 解析失败，跳过
        }
      }
      if (timedOut) break
    }
  } catch {
    timedOut = true
  } finally {
    clearTimeout(timer)
  }

  // 将收集到的 think 内容传给调用方
  if (capturedThink && thinkChunks.length > 0) {
    capturedThink.text = thinkChunks.join('').trim()
  }

  // 降级：超时或失败时用模板
  if (timedOut) {
    const pool = SPEECH_FALLBACKS[personaId] || SPEECH_FALLBACKS.default
    yield pool[Math.floor(Math.random() * pool.length)]
  }
}

/**
 * AI 投票
 *
 * @param personaId 人设 ID
 * @param word AI 拿到的词语
 * @param roundSpeeches 本轮所有发言 [{playerName, content}, ...]
 * @param alivePlayers 存活玩家列表 [{slotIndex, name}, ...]
 * @param currentSlotIndex 当前 AI 的座位号
 * @returns 投票目标玩家名称 + 可选 think 内容
 */
export async function generateVote(
  personaId: string,
  word: string,
  roundSpeeches: Array<{ playerName: string; content: string }>,
  alivePlayers: Array<{ name: string; slotIndex: number }>,
  selfSlotIndex: number,
): Promise<{ playerName: string; thinkContent?: string }> {
  const personaDesc = resolvePersona(personaId)

  // 构造发言 query
  const speechesText = roundSpeeches
    .map((s) => `${s.playerName}：${s.content}`)
    .join('\n')

  const friendsDesc = alivePlayers
    .filter((p) => p.slotIndex !== selfSlotIndex)
    .map((p) => `与${p.name}是普通玩家关系`)
    .join('、')

  if (!API_KEY) {
    // 无 Dify 时的随机投票
    const candidates = alivePlayers.filter(
      (p) => p.slotIndex !== selfSlotIndex,
    )
    if (candidates.length === 0) return { playerName: alivePlayers[0]?.name || '未知玩家' }
    return { playerName: candidates[Math.floor(Math.random() * candidates.length)].name }
  }

  try {
    const rawAnswer = await callDifyBlocking('投票', speechesText, {
      currentWord: word,
      friends: friendsDesc,
      personality: personaDesc,
    })

    // 提取 <think> 内容作为心理旁白
    let thinkContent: string | undefined
    const thinkMatch = rawAnswer.match(/<think>([\s\S]*?)<\/think>/i)
    if (thinkMatch) thinkContent = thinkMatch[1].trim()

    const text = extractAnswer(rawAnswer)
    if (!text) throw new Error('空响应')

    // 如果返回的是玩家昵称，直接返回
    const match = alivePlayers.find((p) => text.includes(p.name))
    if (match) return { playerName: match.name, thinkContent }

    // 没匹配到，随机选
    const candidates = alivePlayers.filter(
      (p) => p.slotIndex !== selfSlotIndex,
    )
    if (candidates.length === 0) return { playerName: alivePlayers[0]?.name || '未知玩家', thinkContent }
    return { playerName: candidates[Math.floor(Math.random() * candidates.length)].name, thinkContent }
  } catch {
    const candidates = alivePlayers.filter(
      (p) => p.slotIndex !== selfSlotIndex,
    )
    if (candidates.length === 0) return { playerName: alivePlayers[0]?.name || '未知玩家' }
    return { playerName: candidates[Math.floor(Math.random() * candidates.length)].name }
  }
}
