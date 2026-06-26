/**
 * game.ts - 游戏状态 (Pinia Store)
 *
 * 职责：响应式数据容器（游戏ID、状态、玩家列表、轮次、词语等）
 * 业务流程由 useGame composable 编排
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Player, GameStatus, Speech, VoteRecord, AIPersona } from '@/types/game'

const PERSONA_NAMES: Record<string, string> = {
  default: '默认', humor: '幽默达人', logic: '逻辑大师',
  newbie: '萌新小白', literary: '文艺青年', grumpy: '暴躁老哥',
}

function resolvePersonaName(aiPersona?: string): string {
  if (!aiPersona) return ''
  try {
    const raw = sessionStorage.getItem('personaNameMap')
    if (raw) {
      const map = JSON.parse(raw)
      if (map[aiPersona]) return map[aiPersona]
    }
  } catch { /* ignore */ }
  return PERSONA_NAMES[aiPersona] || ''
}

export const useGameStore = defineStore('game', () => {
  const gameId = ref('')
  const status = ref<GameStatus>('waiting')
  const currentRound = ref(0)
  const maxRounds = ref(5)
  const players = ref<Player[]>([])
  const undercoverSlotIndex = ref(-1)
  const civilianWord = ref('')
  const undercoverWord = ref('')
  const eliminatedPlayers = ref<number[]>([])
  const winner = ref<'civilian' | 'undercover' | null>(null)
  const isUndercoverEliminated = ref(false)
  const speeches = ref<Speech[]>([])
  const votes = ref<VoteRecord[]>([])
  const currentSpeakerIndex = ref(-1)
  const currentVoterIndex = ref(-1)
  const yourWord = ref('')
  const yourRole = ref('')
  const newAchievements = ref<Array<{ id: string; name: string; icon: string }>>([])

  // ── 计算属性 ──
  const alivePlayers = computed(() =>
    players.value.filter((p) => p.isAlive && !eliminatedPlayers.value.includes(p.slotIndex)),
  )

  const aliveAIPlayers = computed(() =>
    alivePlayers.value.filter((p) => p.type === 'ai'),
  )

  const isFinished = computed(() => status.value === 'finished')

  // 票型统计：{ slotIndex: voteCount }
  const voteTally = computed(() => {
    const tally: Record<number, number> = {}
    for (const v of votes.value) {
      tally[v.targetSlot] = (tally[v.targetSlot] || 0) + 1
    }
    return tally
  })

  const votedCount = computed(() => votes.value.length)
  const aliveCount = computed(() => alivePlayers.value.length)

  // 确认投票进度（所有存活且非已投者都投了，含AI）
  const allVoted = computed(() => {
    return alivePlayers.value.every((p) => votes.value.some((v) => v.voterSlot === p.slotIndex))
  })

  // ── 同步方法 ──
  function setGameState(state: {
    gameId: string
    status?: string
    currentRound?: number
    maxRounds?: number
    players?: Array<{
      slotIndex: number
      customName: string
      isAI?: boolean
      isAlive?: boolean
      aiPersona?: string
      type?: string
    }>
    currentSpeakerIndex?: number
    yourSlotIndex?: number
    yourWord?: string
    yourRole?: string
    speeches?: Array<{
      slotIndex: number
      content: string
      round: number
      isAI: boolean
      persona?: string
      timestamp: number
    }>
    votes?: Array<{
      voterSlot: number
      targetSlot: number
      timestamp: number
    }>
  }) {
    gameId.value = state.gameId
    if (state.status) status.value = state.status as GameStatus
    if (state.currentRound !== undefined) currentRound.value = state.currentRound
    if (state.maxRounds !== undefined) maxRounds.value = state.maxRounds
    if (state.currentSpeakerIndex !== undefined) currentSpeakerIndex.value = state.currentSpeakerIndex
    if (state.yourWord !== undefined) yourWord.value = state.yourWord
    if (state.yourRole !== undefined) yourRole.value = state.yourRole
    // 重连时只用本轮数据（服务端 speeches 全量, votes 仅本轮）
    if (state.speeches) {
      const round = state.currentRound ?? currentRound.value
      speeches.value = state.speeches
        .filter((s) => s.round === round)
        .map((s) => ({
          slotIndex: s.slotIndex,
          content: s.content,
          round: s.round,
          persona: s.persona as AIPersona | undefined,
          isAI: s.isAI,
          timestamp: s.timestamp,
        }))
    }
    if (state.votes) {
      votes.value = state.votes.map((v) => ({
        voterSlot: v.voterSlot,
        targetSlot: v.targetSlot,
        timestamp: v.timestamp,
      }))
    }
    if (state.players) {
      // 从 speeches/votes 反推本轮 flag（重连后状态正确）
      const spokenSet = new Set((state.speeches || []).filter((s) => s.round === (state.currentRound ?? currentRound.value)).map((s) => s.slotIndex))
      const votedSet = new Set((state.votes || []).map((v) => v.voterSlot))
      players.value = state.players.map((p) => ({
        slotIndex: p.slotIndex,
        customName: p.customName || (p.isAI || p.type === 'ai' ? resolvePersonaName(p.aiPersona) || `AI-${p.slotIndex + 1}` : `玩家${p.slotIndex + 1}`),
        type: (p.type ? (p.type === 'ai' ? 'ai' : p.type === 'empty' ? 'empty' : 'human') : p.isAI ? 'ai' : 'human') as Player['type'],
        // 已淘汰的玩家不要被 game_state 快照复活
        isAlive: eliminatedPlayers.value.includes(p.slotIndex) ? false : (p.isAlive ?? true),
        aiPersona: (p.aiPersona || 'default') as AIPersona,
        isCurrentSpeaker: false,
        hasSpokenThisRound: spokenSet.has(p.slotIndex),
        hasVotedThisRound: votedSet.has(p.slotIndex),
      }))
    }
  }

  function setPhase(phase: string) {
    status.value = phase as GameStatus
  }

  function setCurrentSpeaker(slotIndex: number) {
    currentSpeakerIndex.value = slotIndex
    players.value = players.value.map((p) => ({
      ...p,
      isCurrentSpeaker: p.slotIndex === slotIndex,
    }))
  }

  function setCurrentVoter(slotIndex: number) {
    currentVoterIndex.value = slotIndex
  }

  function addAISpeechChunk(slotIndex: number, chunk: string) {
    const idx = speeches.value.length - 1
    const last = speeches.value[idx]
    if (last && last.slotIndex === slotIndex && last.isAI) {
      // 用 splice 替换强制触发 Vue 响应式更新
      const updated = { ...last, content: last.content + chunk }
      speeches.value.splice(idx, 1, updated)
    }
  }

  function addSpeech(speech: Speech) {
    speeches.value.push(speech)
    players.value = players.value.map((p) =>
      p.slotIndex === speech.slotIndex ? { ...p, hasSpokenThisRound: true } : p,
    )
  }

  function addVote(voterSlot: number, targetSlot: number) {
    votes.value.push({ voterSlot, targetSlot, timestamp: Date.now() })
    players.value = players.value.map((p) =>
      p.slotIndex === voterSlot ? { ...p, hasVotedThisRound: true } : p,
    )
  }

  function eliminatePlayer(slotIndex: number) {
    eliminatedPlayers.value.push(slotIndex)
    players.value = players.value.map((p) =>
      p.slotIndex === slotIndex ? { ...p, isAlive: false } : p,
    )
  }

  function nextRound(round: number) {
    currentRound.value = round
    speeches.value = []
    votes.value = []
    players.value = players.value.map((p) => ({
      ...p,
      hasSpokenThisRound: false,
      hasVotedThisRound: false,
    }))
  }

  function setGameOver(w: 'civilian' | 'undercover', cWord: string, uWord: string, uIdx: number, ach: Array<{ id: string; name: string; icon: string }> = []) {
    winner.value = w
    civilianWord.value = cWord
    undercoverWord.value = uWord
    undercoverSlotIndex.value = uIdx
    newAchievements.value = ach
    status.value = 'finished'
  }

  function reset() {
    gameId.value = ''
    status.value = 'waiting'
    currentRound.value = 0
    maxRounds.value = 5
    players.value = []
    undercoverSlotIndex.value = -1
    civilianWord.value = ''
    undercoverWord.value = ''
    eliminatedPlayers.value = []
    winner.value = null
    speeches.value = []
    votes.value = []
    currentSpeakerIndex.value = -1
    currentVoterIndex.value = -1
    newAchievements.value = []
    isUndercoverEliminated.value = false
  }

  return {
    gameId, status, currentRound, maxRounds,
    players, undercoverSlotIndex, civilianWord, undercoverWord,
    eliminatedPlayers, winner, isUndercoverEliminated, speeches, votes,
    currentSpeakerIndex, currentVoterIndex,
    yourWord, yourRole, newAchievements,
    alivePlayers, aliveAIPlayers, isFinished,
    voteTally, votedCount, aliveCount, allVoted,
    setGameState, setPhase, setCurrentSpeaker, setCurrentVoter,
    addAISpeechChunk, addSpeech, addVote,
    eliminatePlayer, nextRound, setGameOver, reset,
  }
})
