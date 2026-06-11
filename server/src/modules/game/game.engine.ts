/**
 * game.engine.ts - 游戏状态机（基于 xstate v5）
 *
 * 状态流转：
 * WAITING → ROLE_ASSIGN → SPEAKING ⇄ VOTING → RESULT → FINISHED
 */
import { createMachine, assign } from 'xstate'
import type { Player, Speech, VoteRecord } from '../../types/game.js'
import { GAME_SLOTS, MAX_ROUNDS } from '../../config/constants.js'
import crypto from 'node:crypto'

// ─── 上下文类型 ───
interface GameContext {
  gameId: string
  civilianWord: string
  undercoverWord: string
  players: Player[]
  currentRound: number
  currentSpeakerIndex: number
  undercoverSlotIndex: number
  speeches: Speech[]
  votes: VoteRecord[]
  eliminatedPlayers: number[]
  maxRounds: number
}

// ─── 事件类型 ───
type GameEvent =
  | { type: 'START_GAME'; civilianWord: string; undercoverWord: string; players: Player[] }
  | { type: 'ROLES_ASSIGNED' }
  | { type: 'SPEECH_SUBMIT'; slotIndex: number; content: string }
  | { type: 'ALL_SPOKEN' }
  | { type: 'VOTE_CAST'; voterSlot: number; targetSlot: number }
  | { type: 'ALL_VOTED' }
  | { type: 'ELIMINATE' }
  | { type: 'CHECK_WINNER' }
  | { type: 'NEXT_ROUND' }
  | { type: 'GAME_OVER' }

// ─── 状态机定义 ───
export const gameMachine = createMachine({
  id: 'undercoverGame',
  initial: 'waiting',
  context: {} as GameContext,
  types: {} as {
    context: GameContext
    events: GameEvent
  },
  states: {
    waiting: {
      on: {
        START_GAME: {
          target: 'role_assign',
          actions: assign({
            gameId: () => crypto.randomUUID(),
            civilianWord: ({ event }) => event.civilianWord,
            undercoverWord: ({ event }) => event.undercoverWord,
            players: ({ event }) => event.players,
            currentRound: 0,
            speeches: () => [],
            votes: () => [],
            eliminatedPlayers: () => [],
          }),
        },
      },
    },

    role_assign: {
      entry: assign({
        // 随机选择 1 人为卧底
        undercoverSlotIndex: () => Math.floor(Math.random() * GAME_SLOTS),
        currentRound: ({ context }) => context.currentRound + 1,
      }),
      // 分配完成，自动进入发言阶段
      always: {
        target: 'speaking',
        actions: assign({
          players: ({ context }) =>
            context.players.map((p, i) => ({
              ...p,
              role: i === context.undercoverSlotIndex
                ? ('undercover' as const)
                : ('civilian' as const),
              word:
                i === context.undercoverSlotIndex
                  ? context.undercoverWord
                  : context.civilianWord,
            })),
          currentSpeakerIndex: 0,
        }),
      },
    },

    speaking: {
      // 收到发言 → 记录发言 → 轮到下一个人
      on: {
        SPEECH_SUBMIT: {
          actions: assign({
            speeches: ({ context, event }) => [
              ...context.speeches,
              {
                slotIndex: event.slotIndex,
                content: event.content,
                round: context.currentRound,
                isAI: false,
                timestamp: Date.now(),
              },
            ],
            currentSpeakerIndex: ({ context }) => {
              // 找下一个存活的发言人
              let next = context.currentSpeakerIndex + 1
              while (next < GAME_SLOTS) {
                if (!context.eliminatedPlayers.includes(next)) return next
                next++
              }
              return -1 // 所有人发言完毕
            },
          }),
        },
        ALL_SPOKEN: 'voting',
      },
    },

    voting: {
      on: {
        VOTE_CAST: {
          actions: assign({
            votes: ({ context, event }) => [
              ...context.votes,
              {
                voterSlot: event.voterSlot,
                targetSlot: event.targetSlot,
                timestamp: Date.now(),
              },
            ],
          }),
        },
        ALL_VOTED: 'eliminate',
      },
    },

    eliminate: {
      entry: assign({
        // 计算票数，淘汰最高票者；平票则无人淘汰
        eliminatedPlayers: ({ context }) => {
          const votesByTarget: Record<number, number> = {}
          for (const v of context.votes) {
            votesByTarget[v.targetSlot] = (votesByTarget[v.targetSlot] || 0) + 1
          }
          let maxVotes = 0
          let maxSlot = -1
          let isTie = false
          for (const [slot, count] of Object.entries(votesByTarget)) {
            const s = Number(slot)
            if (count > maxVotes) {
              maxVotes = count
              maxSlot = s
              isTie = false
            } else if (count === maxVotes) {
              isTie = true
            }
          }
          if (isTie || maxSlot === -1) return [...context.eliminatedPlayers]
          return [...context.eliminatedPlayers, maxSlot]
        },
      }),
      always: 'check_winner',
    },

    check_winner: {
      always: [
        // 卧底被淘汰 → 平民胜利
        {
          target: 'result',
          guard: ({ context }) =>
            context.eliminatedPlayers.includes(context.undercoverSlotIndex),
        },
        // 只剩 2 人且卧底存活 → 卧底胜利
        {
          target: 'result',
          guard: ({ context }) => {
            const alive = context.players.filter(
              (_, i) => !context.eliminatedPlayers.includes(i),
            )
            return (
              alive.length <= 2 &&
              !context.eliminatedPlayers.includes(context.undercoverSlotIndex)
            )
          },
        },
        // 达到最大轮数 → 卧底胜利
        {
          target: 'result',
          guard: ({ context }) => context.currentRound >= (context.maxRounds || MAX_ROUNDS),
        },
        // 还没结束 → 下一轮
        { target: 'next_round' },
      ],
    },

    next_round: {
      entry: assign({
        currentRound: ({ context }) => context.currentRound + 1,
        speeches: () => [],
        votes: () => [],
        currentSpeakerIndex: 0,
      }),
      always: 'speaking',
    },

    result: {
      always: 'finished',
    },

    finished: {
      type: 'final',
    },
  },
})
