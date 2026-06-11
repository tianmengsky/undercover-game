/**
 * game.replay.ts - 游戏回放事件收集
 *
 * 内存存储每局游戏的所有关键事件，结束后通过 REST API 查询。
 * 事件类型：game_start, round_start, speech, vote_cast, elimination, game_over
 */

interface ReplayEvent {
  seq: number
  type: 'game_start' | 'round_start' | 'speech' | 'vote_cast' | 'elimination' | 'game_over'
  payload: Record<string, unknown>
  timestamp: number
  aiInnerThought?: string
  _fullThink?: string
}

const replayMap = new Map<string, ReplayEvent[]>()

export function startReplay(gameId: string): void {
  replayMap.set(gameId, [])
}

export function recordEvent(
  gameId: string,
  event: { type: ReplayEvent['type']; payload: Record<string, unknown>; timestamp?: number },
): void {
  const events = replayMap.get(gameId)
  if (!events) return
  events.push({
    seq: events.length + 1,
    type: event.type,
    payload: event.payload,
    timestamp: event.timestamp ?? Date.now(),
  })
}

export function getReplay(gameId: string): ReplayEvent[] {
  return replayMap.get(gameId) ?? []
}

export function removeReplay(gameId: string): void {
  replayMap.delete(gameId)
}

// ═══════════════════════════════════
// AI 心理旁白 — 本地模板生成
// ═══════════════════════════════════

type ThoughtContext = {
  playerName: string
  personaId: string
  role: 'civilian' | 'undercover'
  eventType: 'speech' | 'vote_cast' | 'elimination'
  content?: string
  targetName?: string
  wasUndercover?: boolean
}

const THOUGHT_TEMPLATES: Record<string, {
  speech: string[]
  vote_cast: string[]
  elimination_undercover: string[]
  elimination_civilian: string[]
}> = {
  default: {
    speech: [
      '（这样说应该不会露馅吧...他们能猜出来吗？）',
      '（嗯，这个描述还算合理，不会太具体也不会太模糊。）',
      '（希望我的描述没给卧底太多线索...）',
    ],
    vote_cast: [
      '（直觉告诉我这个人最可疑，投他没错。）',
      '（这个人的发言前后矛盾，肯定是卧底！）',
    ],
    elimination_undercover: [
      '（完了完了，还是暴露了...他们怎么看出来的？）',
    ],
    elimination_civilian: [
      '（太可惜了，又一个好人被冤枉...）',
    ],
  },
  humor: {
    speech: [
      '（哈哈哈哈我这比喻太绝了，他们肯定猜不到真词是啥！）',
      '（忍住忍住，不能笑场，这是个严肃的游戏...）',
      '（我这描述水平，他们应该给我颁个奥斯卡。）',
    ],
    vote_cast: [
      '（就冲他这发言风格，太正经了，绝对心里有鬼！）',
      '（这人说话太干了，一点幽默感都没有，卧底无疑。）',
    ],
    elimination_undercover: [
      '（笑死，我这么幽默的卧底竟然被发现了，你们不配拥有快乐！）',
    ],
    elimination_civilian: [
      '（这个倒霉蛋被冤死了，不过没事，笑一个就好。）',
    ],
  },
  logic: {
    speech: [
      '（根据逻辑分析，选择这个角度描述最不容易被卧底利用。）',
      '（措辞模糊但有信息量，足够让好人听懂，卧底抓瞎。）',
      '（数据表明第一轮发言越中庸越好，先观察再发力。）',
    ],
    vote_cast: [
      '（交叉比对完毕，这个人的发言存在 3 处逻辑漏洞。）',
      '（统计学角度，此人的语义向量偏离均值 2.3 个标准差。）',
    ],
    elimination_undercover: [
      '（推理失败...看来数据样本还不够大。下次要多收集几轮。）',
    ],
    elimination_civilian: [
      '（又一条无辜数据被剔除，算法还需要优化。）',
    ],
  },
  newbie: {
    speech: [
      '（啊？我说的是啥？算了随便说说吧...）',
      '（他们都在看着我，好紧张...这样说应该可以吧？）',
      '（这个词到底是什么来着...反正大概就这样吧...）',
    ],
    vote_cast: [
      '（完全看不出来谁是卧底，随便投一个吧...）',
      '（他说话我听不懂，肯定有问题！对吧...？）',
    ],
    elimination_undercover: [
      '（啊...被发现了...可是我真的好努力在演啊 T_T）',
    ],
    elimination_civilian: [
      '（又一个被投出去的...怎么感觉下一个就是我了...）',
    ],
  },
  literary: {
    speech: [
      '（用最温柔的字句描摹最平凡的事物，这才是生活的诗意。）',
      '（这句比喻应该能让懂的人会心一笑吧。）',
      '（词语是有限的，但描述它的语言可以无限优美。）',
    ],
    vote_cast: [
      '（他的发言缺乏美感，内心必定没有诗和远方。）',
      '（言为心声，从措辞中我感受到了不安与伪装。）',
    ],
    elimination_undercover: [
      '（我以诗意掩盖真相，却终究被现实的利刃揭穿...）',
    ],
    elimination_civilian: [
      '（又一位善良的灵魂被误解，愿真相早日大白。）',
    ],
  },
  grumpy: {
    speech: [
      '（啧，非要我说，那我就随便说说，爱信不信。）',
      '（这游戏真麻烦，不过比上班强。）',
      '（赶紧说完赶紧过，下一个是谁？）',
    ],
    vote_cast: [
      '（这人废话最多，看着就烦，投他！）',
      '（他说的那些拐弯抹角的，一看就不是好东西。）',
    ],
    elimination_undercover: [
      '（切，被发现了又怎样，老子玩得开心就行！）',
    ],
    elimination_civilian: [
      '（又投错一个，这群人眼睛都长哪儿去了？）',
    ],
  },
}

/**
 * 解析人设 ID，内置人设直接用，自定义 UUID 返回 default
 */
function resolveThoughtPersona(personaId: string): string {
  if (THOUGHT_TEMPLATES[personaId]) return personaId
  return 'default'
}

/**
 * 为所有 AI 相关事件生成心理旁白（同步、本地模板）
 * 在 game_over 之前调用，确保回放 API 可以取到
 */
export function generateInnerThoughts(gameId: string, state: {
  players: Array<{ slotIndex: number; customName: string; role: string; persona?: string }>
  undercoverSlotIndex: number
}): void {
  const events = replayMap.get(gameId)
  if (!events) return

  for (const ev of events) {
    if (ev.aiInnerThought) continue

    // 优先使用 Dify 返回的真实 <think> 内容（speech 和 vote 都适用）
    const thinkContent = ev.payload.thinkContent as string | undefined
    if (thinkContent) {
      // 截断长文本，保留最多 200 字并在句号处断
      if (thinkContent.length > 200) {
        const cut = thinkContent.slice(0, 200)
        const lastPeriod = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('？'), cut.lastIndexOf('！'))
        ev.aiInnerThought = (lastPeriod > 100 ? cut.slice(0, lastPeriod + 1) : cut) + '...'
      } else {
        ev.aiInnerThought = thinkContent
      }
      // 保留完整 think 供前端展开
      ev._fullThink = thinkContent
      continue
    }

    let ctx: ThoughtContext | null = null

    if (ev.type === 'speech' && ev.payload.isAI) {
      const slotIdx = ev.payload.slotIndex as number
      const player = state.players.find((p) => p.slotIndex === slotIdx)
      if (!player) continue
      ctx = {
        playerName: (ev.payload.playerName as string) || player.customName,
        personaId: player.persona || ev.payload.persona as string || 'default',
        role: (player.role === 'undercover' ? 'undercover' : 'civilian'),
        eventType: 'speech',
        content: ev.payload.content as string,
      }
    }

    if (ev.type === 'vote_cast' && ev.payload.isAI) {
      const slotIdx = ev.payload.voterSlot as number
      const player = state.players.find((p) => p.slotIndex === slotIdx)
      if (!player) continue
      ctx = {
        playerName: (ev.payload.voterName as string) || player.customName,
        personaId: player.persona || 'default',
        role: (player.role === 'undercover' ? 'undercover' : 'civilian'),
        eventType: 'vote_cast',
        targetName: ev.payload.targetName as string,
      }
    }

    if (ev.type === 'elimination') {
      const slotIdx = ev.payload.slotIndex as number
      const player = state.players.find((p) => p.slotIndex === slotIdx)
      if (!player) continue
      const isUndercover = player.role === 'undercover'
      ctx = {
        playerName: (ev.payload.playerName as string) || player.customName,
        personaId: player.persona || 'default',
        role: isUndercover ? 'undercover' : 'civilian',
        eventType: 'elimination',
        wasUndercover: isUndercover,
      }
    }

    if (!ctx) continue

    const tpl = resolveThoughtPersona(ctx.personaId)
    const templates = THOUGHT_TEMPLATES[tpl] || THOUGHT_TEMPLATES.default

    let pool: string[]
    if (ctx.eventType === 'elimination') {
      pool = ctx.wasUndercover
        ? templates.elimination_undercover
        : templates.elimination_civilian
    } else {
      pool = templates[ctx.eventType]
    }
    ev.aiInnerThought = pool[Math.floor(Math.random() * pool.length)]
  }
}
