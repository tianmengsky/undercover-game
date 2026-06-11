/**
 * constants.ts - 前端常量定义
 *
 * 与后端 config/constants.ts 保持一致
 */
export const GAME_SLOTS = 6
export const MAX_ROUNDS = 5
export const SPEECH_TIMEOUT_SEC = 30
export const VOTE_TIMEOUT_SEC = 30

export const AI_PERSONAS = [
  { id: 'default', name: '默认', desc: '中性理性地描述词语' },
  { id: 'humor', name: '幽默达人', desc: '用笑话和段子描述，喜欢玩梗' },
  { id: 'logic', name: '逻辑大师', desc: '严谨推理，喜欢拆解词语结构' },
  { id: 'newbie', name: '萌新小白', desc: '故意说得模糊，偶尔跑题' },
  { id: 'literary', name: '文艺青年', desc: '用比喻和诗句描述' },
  { id: 'grumpy', name: '暴躁老哥', desc: '说话冲，但实际在伪装' },
] as const
