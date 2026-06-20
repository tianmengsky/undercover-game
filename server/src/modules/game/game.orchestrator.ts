/**
 * game.orchestrator.ts - 游戏调度器
 *
 * 协调完整游戏流程：发言阶段 → 投票阶段 → 淘汰 → 判胜 → 下一轮 / 结束
 * 由 game.routes.ts 的 start 路由触发，异步运行不阻塞 HTTP 响应
 */
import { roomManager } from './game.manager.js'
import { generateSpeech, generateVote } from './game.ai.js'
import { recordGame, checkAchievements, registerWordPair, getUserStats } from '../stats/stats.service.js'
import { startReplay, recordEvent, generateInnerThoughts } from './game.replay.js'
import { incrementPersonaUsage, getPersona } from '../persona/persona.service.js'
import { checkPersonaStar, checkPersonaCreator } from '../stats/stats.service.js'
import type { Speech, VoteRecord } from '../../types/game.js'

// 6 个不在 DB 中的旧人物 ID → voice 硬编码
const LEGACY_VOICE: Record<string, { voicePitch: number; voiceRate: number; voiceVolume: number }> = {
  default: { voicePitch: 100, voiceRate: 140, voiceVolume: 100 },
  humor: { voicePitch: 120, voiceRate: 170, voiceVolume: 100 },
  logic: { voicePitch: 105, voiceRate: 160, voiceVolume: 100 },
  newbie: { voicePitch: 110, voiceRate: 135, voiceVolume: 100 },
  literary: { voicePitch: 95, voiceRate: 130, voiceVolume: 100 },
  grumpy: { voicePitch: 80, voiceRate: 180, voiceVolume: 100 },
}
import { SPEECH_TIMEOUT_SEC, VOTE_TIMEOUT_SEC, MAX_ROUNDS } from '../../config/constants.js'

// ─── 工具函数 ───

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function broadcast(gameId: string, type: string, payload: Record<string, unknown> = {}): void {
  roomManager.broadcast(gameId, type, payload)
}

function getAlivePlayers(gameId: string) {
  const room = roomManager.getRoom(gameId)
  if (!room) return []
  return room.players.filter(
    (p) => p.isAlive && !room.eliminatedPlayers.includes(p.slotIndex),
  )
}

// ─── 淘汰计算 ───

function calculateElimination(votes: VoteRecord[], alivePlayers: Array<{ slotIndex: number }>): number {
  if (votes.length === 0) return -1

  const tally: Record<number, number> = {}
  for (const v of votes) {
    tally[v.targetSlot] = (tally[v.targetSlot] || 0) + 1
  }

  let maxVotes = 0
  let maxSlot = -1
  let tie = false

  for (const [slotStr, count] of Object.entries(tally)) {
    const slot = Number(slotStr)
    if (count > maxVotes) {
      maxVotes = count
      maxSlot = slot
      tie = false
    } else if (count === maxVotes) {
      tie = true
    }
  }

  return tie ? -1 : maxSlot
}

// ─── 判胜 ───

function checkWinner(gameId: string): 'civilian' | 'undercover' | null {
  const room = roomManager.getRoom(gameId)
  if (!room) return null

  if (room.eliminatedPlayers.includes(room.undercoverSlotIndex)) {
    return 'civilian'
  }

  const aliveCount = room.players.filter(
    (p) => p.isAlive && !room.eliminatedPlayers.includes(p.slotIndex),
  ).length

  if (aliveCount <= 2 && !room.eliminatedPlayers.includes(room.undercoverSlotIndex)) {
    return 'undercover'
  }

  if (room.currentRound >= (room.maxRounds || MAX_ROUNDS)) {
    return 'undercover'
  }

  return null
}

// ─── 发言阶段 ───

async function runSpeakingPhase(gameId: string): Promise<void> {
  const room = roomManager.getRoom(gameId)
  if (!room) return

  roomManager.updateRoom(gameId, { status: 'speaking' })
  broadcast(gameId, 'phase_change', { phase: 'speaking', round: room.currentRound })

  const alivePlayers = getAlivePlayers(gameId)
  const speeches: Speech[] = []

  for (const player of alivePlayers) {
    // 检查是否游戏已被中断
    if (roomManager.getRoom(gameId)?.status === 'finished') return

    broadcast(gameId, 'current_speaker', {
      slotIndex: player.slotIndex,
      playerName: player.customName,
    })

    if (player.type === 'ai') {
      // ── AI 发言（流式） ──
      console.log(`[orchestrator] ${gameId} 发言阶段: AI ${player.customName}(slot=${player.slotIndex}) 开始发言`)
      // 仅用本轮发言，避免逐轮累积导致 prompt 过长
      const history = speeches
        .map((s) => `${room.players[s.slotIndex]?.customName ?? '玩家'}：${s.content}`)
        .join('\n')

      broadcast(gameId, 'ai_speech_start', { slotIndex: player.slotIndex })

      let fullContent = ''
      const capturedThink = { text: '' }
      try {
        const stream = generateSpeech(
          player.aiPersona || 'default',
          player.word || room.civilianWord,
          player.slotIndex,
          history || '还没有人发言',
          room.currentRound,
          alivePlayers.map((p) => ({ slotIndex: p.slotIndex, name: p.customName })),
          capturedThink,
        )

        for await (const chunk of stream) {
          fullContent += chunk
          broadcast(gameId, 'ai_speech_chunk', {
            slotIndex: player.slotIndex,
            chunk,
          })
        }
      } catch (err) {
        console.error(`[orchestrator] AI ${player.slotIndex} 发言失败:`, err)
      }

      if (!fullContent.trim()) {
        fullContent = '嗯……这个挺难描述的，容我想想。'
      }

      speeches.push({
        slotIndex: player.slotIndex,
        content: fullContent,
        round: room.currentRound,
        persona: player.aiPersona,
        isAI: true,
        timestamp: Date.now(),
      })

      const personaId = player.aiPersona
      let voice = LEGACY_VOICE[personaId]
      let voiceName = ''
      if (!voice) {
        const p = getPersona(personaId)
        voice = p ? { voicePitch: p.voicePitch, voiceRate: p.voiceRate, voiceVolume: p.voiceVolume } : LEGACY_VOICE.default
        voiceName = p?.voiceName || ''
      }
      broadcast(gameId, 'ai_speech_end', {
        slotIndex: player.slotIndex,
        playerName: player.customName,
        content: fullContent,
        persona: personaId,
        voicePitch: voice.voicePitch,
        voiceRate: voice.voiceRate,
        voiceVolume: voice.voiceVolume,
        voiceName,
      })

      recordEvent(gameId, {
        type: 'speech',
        payload: {
          slotIndex: player.slotIndex,
          playerName: player.customName,
          content: fullContent,
          persona: player.aiPersona,
          isAI: true,
          thinkContent: capturedThink.text || undefined,
        },
      })

      console.log(`[orchestrator] ${gameId} 发言阶段: AI ${player.customName} 发言完成 (${fullContent.length}字)`)
      await sleep(1500)
    } else {
      // ── 人类发言（等待 WS 输入） ──
      console.log(`[orchestrator] ${gameId} 发言阶段: 等待人类 ${player.customName}(slot=${player.slotIndex}) 发言...`)
      broadcast(gameId, 'request_speech', {
        slotIndex: player.slotIndex,
        deadline: Date.now() + SPEECH_TIMEOUT_SEC * 1000,
        timeoutSec: SPEECH_TIMEOUT_SEC,
      })

      try {
        const content = await roomManager.waitForHumanSpeech(
          gameId,
          SPEECH_TIMEOUT_SEC * 1000,
        )

        speeches.push({
          slotIndex: player.slotIndex,
          content,
          round: room.currentRound,
          isAI: false,
          timestamp: Date.now(),
        })

        broadcast(gameId, 'player_speech_broadcast', {
          slotIndex: player.slotIndex,
          playerName: player.customName,
          content,
        })

        recordEvent(gameId, {
          type: 'speech',
          payload: {
            slotIndex: player.slotIndex,
            playerName: player.customName,
            content,
            isAI: false,
          },
        })
      } catch {
        // 超时：跳过该玩家
        broadcast(gameId, 'speech_timeout', {
          slotIndex: player.slotIndex,
          playerName: player.customName,
        })
      }
    }
  }

  // 保存发言记录
  roomManager.updateRoom(gameId, {
    speeches: [...(room.speeches || []), ...speeches],
    players: room.players.map((p) => {
      const spokeThisRound = speeches.some((s) => s.slotIndex === p.slotIndex)
      return { ...p, hasSpokenThisRound: spokeThisRound }
    }),
  })
}

// ─── 投票阶段 ───

async function runVotingPhase(gameId: string): Promise<void> {
  const room = roomManager.getRoom(gameId)
  if (!room) return

  roomManager.updateRoom(gameId, { status: 'voting' })
  broadcast(gameId, 'phase_change', { phase: 'voting', round: room.currentRound })
  console.log(`[orchestrator] ${gameId} === 投票阶段开始 (第${room.currentRound}轮) ===`)

  const alivePlayers = getAlivePlayers(gameId)
  const votes: VoteRecord[] = []

  for (const player of alivePlayers) {
    if (roomManager.getRoom(gameId)?.status === 'finished') return

    broadcast(gameId, 'current_voter', {
      slotIndex: player.slotIndex,
      playerName: player.customName,
    })

    if (player.type === 'ai') {
      // ── AI 投票 ──
      const aliveSlotSet = new Set(alivePlayers.map((p) => p.slotIndex))
      const roundSpeeches = (room.speeches || [])
        .filter((s) => s.round === room.currentRound && aliveSlotSet.has(s.slotIndex)) // 仅本轮 + 过滤已淘汰玩家
        .map((s) => ({
          playerName: (s.slotIndex === player.slotIndex
            ? `${room.players[s.slotIndex]?.customName ?? '玩家'}(这是你自己的发言)`
            : room.players[s.slotIndex]?.customName ?? `玩家${s.slotIndex + 1}`),
          content: s.content,
        }))

      const voteResult = await generateVote(
        player.aiPersona || 'default',
        player.word || room.civilianWord,
        roundSpeeches,
        alivePlayers.map((p) => ({ name: p.customName, slotIndex: p.slotIndex })),
        player.slotIndex,
      )

      const targetName = voteResult.playerName

      // 按昵称匹配目标
      const target = alivePlayers.find(
        (p) => p.customName === targetName,
      )
      const targetSlot = target
        ? target.slotIndex
        : alivePlayers.find((p) => p.slotIndex !== player.slotIndex)!.slotIndex

      votes.push({
        voterSlot: player.slotIndex,
        targetSlot,
        timestamp: Date.now(),
      })

      broadcast(gameId, 'vote_cast', {
        voterSlot: player.slotIndex,
        voterName: player.customName,
        targetSlot,
        targetName: room.players[targetSlot]?.customName,
      })

      recordEvent(gameId, {
        type: 'vote_cast',
        payload: {
          voterSlot: player.slotIndex,
          voterName: player.customName,
          targetSlot,
          targetName: room.players[targetSlot]?.customName,
          isAI: true,
          thinkContent: voteResult.thinkContent || undefined,
        },
      })

      console.log(`[orchestrator] ${gameId} 投票: AI ${player.customName} → ${room.players[targetSlot]?.customName}`)
      await sleep(1000)
    } else {
      // ── 人类投票（等待 WS 输入） ──
      broadcast(gameId, 'request_vote', {
        slotIndex: player.slotIndex,
        candidates: alivePlayers
          .filter((p) => p.slotIndex !== player.slotIndex)
          .map((p) => ({ slotIndex: p.slotIndex, playerName: p.customName })),
        deadline: Date.now() + VOTE_TIMEOUT_SEC * 1000,
        timeoutSec: VOTE_TIMEOUT_SEC,
      })

      try {
        const targetSlot = await roomManager.waitForHumanVote(
          gameId,
          VOTE_TIMEOUT_SEC * 1000,
        )

        votes.push({
          voterSlot: player.slotIndex,
          targetSlot,
          timestamp: Date.now(),
        })

        broadcast(gameId, 'vote_cast', {
          voterSlot: player.slotIndex,
          voterName: player.customName,
          targetSlot,
          targetName: room.players[targetSlot]?.customName,
        })

        recordEvent(gameId, {
          type: 'vote_cast',
          payload: {
            voterSlot: player.slotIndex,
            voterName: player.customName,
            targetSlot,
            targetName: room.players[targetSlot]?.customName,
            isAI: false,
          },
        })
      } catch {
        // 超时：随机投票
        const candidates = alivePlayers.filter((p) => p.slotIndex !== player.slotIndex)
        const randomTarget = candidates[Math.floor(Math.random() * candidates.length)]

        if (randomTarget) {
          votes.push({
            voterSlot: player.slotIndex,
            targetSlot: randomTarget.slotIndex,
            timestamp: Date.now(),
          })

          broadcast(gameId, 'vote_timeout', {
            slotIndex: player.slotIndex,
            playerName: player.customName,
            votedFor: randomTarget.slotIndex,
          })
        }
      }
    }
  }

  // 保存投票记录
  roomManager.updateRoom(gameId, {
    votes: [...(room.votes || []), ...votes],
    players: room.players.map((p) => {
      const votedThisRound = votes.some((v) => v.voterSlot === p.slotIndex)
      return { ...p, hasVotedThisRound: votedThisRound }
    }),
  })
}

// ─── 淘汰阶段 ───

async function runEliminationPhase(gameId: string): Promise<string | null> {
  const room = roomManager.getRoom(gameId)
  if (!room) return null

  const alivePlayers = getAlivePlayers(gameId)
  const thisRoundVotes = room.votes || []
  const eliminatedSlot = calculateElimination(thisRoundVotes, alivePlayers)

  if (eliminatedSlot >= 0) {
    const eliminated = room.players[eliminatedSlot]

    console.log(`[orchestrator] ${gameId} 淘汰: ${eliminated?.customName}(slot=${eliminatedSlot}), 卧底=${eliminatedSlot === room.undercoverSlotIndex}`)

    roomManager.updateRoom(gameId, {
      eliminatedPlayers: [...room.eliminatedPlayers, eliminatedSlot],
      players: room.players.map((p) =>
        p.slotIndex === eliminatedSlot ? { ...p, isAlive: false } : p,
      ),
    })

    broadcast(gameId, 'player_eliminated', {
      slotIndex: eliminatedSlot,
      playerName: eliminated?.customName ?? `玩家${eliminatedSlot + 1}`,
      wasUndercover: eliminatedSlot === room.undercoverSlotIndex,
    })

    recordEvent(gameId, {
      type: 'elimination',
      payload: {
        slotIndex: eliminatedSlot,
        playerName: eliminated?.customName ?? `玩家${eliminatedSlot + 1}`,
        wasUndercover: eliminatedSlot === room.undercoverSlotIndex,
      },
    })
  } else {
    console.log(`[orchestrator] ${gameId} 淘汰: 平票无人淘汰 (round=${room.currentRound})`)
    broadcast(gameId, 'elimination_tie', {
      message: '平票，无人淘汰',
    })
  }

  // 判胜
  const winner = checkWinner(gameId)

  if (winner) {
    console.log(`[orchestrator] ${gameId} === ${winner === 'civilian' ? '平民' : '卧底'}胜利! 词语: ${room.civilianWord}/${room.undercoverWord}, 共${room.currentRound}轮 ===`)
    roomManager.updateRoom(gameId, { status: 'finished' })

    // 记录战绩（仅人类玩家）
    let achievementList: any[] = []
    if (room.humanUserId) {
      const humanPlayer = room.players.find((p) => p.type === 'human')
      if (humanPlayer) {
        const won = humanPlayer.role === winner
        const totalVotes = room.votes.filter((v) => v.voterSlot === humanPlayer.slotIndex).length
        const correctVotes = room.votes.filter(
          (v) => v.voterSlot === humanPlayer.slotIndex && v.targetSlot === room.undercoverSlotIndex,
        ).length

        // 记录词语对（用于 word_master 成就）
        await registerWordPair(room.humanUserId, `${room.civilianWord}/${room.undercoverWord}`)

        // 计算 MVP：投票命中卧底次数最多的存活玩家
        let mvpSlot = -1
        let mvpScore = -1

        for (const v of room.votes) {
          if (v.targetSlot === room.undercoverSlotIndex) {
            const c = room.votes.filter((x) => x.voterSlot === v.voterSlot && x.targetSlot === room.undercoverSlotIndex).length
            if (c > mvpScore) { mvpScore = c; mvpSlot = v.voterSlot }
          }
        }
        const isMvp = mvpSlot === humanPlayer.slotIndex

        await recordGame({
          userId: room.humanUserId,
          nickname: humanPlayer.customName,
          won,
          role: humanPlayer.role as 'civilian' | 'undercover',
          survivedRounds: humanPlayer.isAlive ? room.currentRound : room.currentRound - 1,
          isMvp,
          correctVotes,
          wordPair: `${room.civilianWord}/${room.undercoverWord}`,
          totalRounds: room.currentRound,
        })

        // 检测成就
        const eliminatedUndercoverRound = room.eliminatedPlayers.includes(room.undercoverSlotIndex)
          ? room.currentRound : -1
        const userStats = await getUserStats(room.humanUserId)!
        const newAchievements = await checkAchievements(room.humanUserId, {
          gameResult: {
            won,
            role: humanPlayer.role as 'civilian' | 'undercover',
            survivedRounds: humanPlayer.isAlive ? room.currentRound : room.currentRound - 1,
            isMvp,
            correctVotes,
            totalVotes,
            eliminatedUndercoverRound,
          },
          userStats,
        })

        achievementList = newAchievements

        // 累计成就经验到 room，供 result API 读取
        let totalAchievementExp = 0
        for (const ach of newAchievements) {
          totalAchievementExp += (ach as any).rewardExp || 0
        }
        roomManager.updateRoom(gameId, { achievementExpGained: totalAchievementExp })

        if (newAchievements.length > 0) {
          broadcast(gameId, 'achievement_unlocked', { achievements: newAchievements })
        }

        // 累加 AI 人设使用次数 + 检测 persona_star
        for (const p of room.players) {
          if (p.type === 'ai' && p.aiPersona && p.aiPersona !== 'default') {
            await incrementPersonaUsage(p.aiPersona)
            const persona = await getPersona(p.aiPersona)
            if (persona && persona.authorId !== '_official_' && persona.usageCount >= 10) {
              const starAch = await checkPersonaStar(persona.authorId)
              if (starAch) {
                broadcast(gameId, 'achievement_unlocked', { achievements: [starAch] })
              }
            }
          }
        }
      }
    }

    // 生成 AI 心理旁白（游戏结束前同步完成，确保回放 API 可取到）
    generateInnerThoughts(gameId, {
      players: room.players.map((p) => ({
        slotIndex: p.slotIndex,
        customName: p.customName,
        role: p.role || 'civilian',
        persona: p.aiPersona || (p as any).persona,
      })),
      undercoverSlotIndex: room.undercoverSlotIndex,
    })

    recordEvent(gameId, {
      type: 'game_over',
      payload: {
        winner,
        civilianWord: room.civilianWord,
        undercoverWord: room.undercoverWord,
        totalRounds: room.currentRound,
      },
    })

    broadcast(gameId, 'game_over', {
      winner,
      civilianWord: room.civilianWord,
      undercoverWord: room.undercoverWord,
      undercoverSlotIndex: room.undercoverSlotIndex,
      totalRounds: room.currentRound,
      newAchievements: achievementList,
      players: room.players.map((p) => ({
        slotIndex: p.slotIndex,
        customName: p.customName,
        role: p.role,
        isAlive: p.isAlive,
      })),
    })
  }

  return winner
}

// ─── 主循环（公开入口） ───

/**
 * 运行完整游戏流程。
 * 由 POST /api/games/:id/start 路由触发，异步执行不阻塞 HTTP 响应。
 */
export async function runGameLoop(gameId: string): Promise<void> {
  const room = roomManager.getRoom(gameId)
  if (!room) {
    console.error(`[orchestrator] 房间 ${gameId} 不存在`)
    return
  }

  if (roomManager.isLoopRunning(gameId)) {
    console.warn(`[orchestrator] 房间 ${gameId} 的 game loop 已在运行`)
    return
  }

  roomManager.markLoopRunning(gameId)
  console.log(`[orchestrator] 游戏开始: ${gameId}, 共 ${room.players.length} 名玩家, 卧底位: ${room.undercoverSlotIndex}`)

  // 开始回放录制
  startReplay(gameId)
  recordEvent(gameId, {
    type: 'game_start',
    payload: { totalPlayers: room.players.length, maxRounds: room.maxRounds },
  })

  try {
    // 给前端一点时间连接 WebSocket
    await sleep(500)

    // 广播角色分配完成
    broadcast(gameId, 'game_started', {
      gameId,
      currentRound: room.currentRound,
      maxRounds: room.maxRounds,
      players: room.players.map((p) => ({
        slotIndex: p.slotIndex,
        customName: p.customName,
        type: p.type,
        isAlive: p.isAlive,
        aiPersona: p.aiPersona,
      })),
    })

    // ── 游戏主循环 ──
    let localRound = 0 // 本地轮次计数，比 currentRound 可靠
    while (true) {
      const currentRoom = roomManager.getRoom(gameId)
      if (!currentRoom || currentRoom.status === 'finished') break

      localRound++
      roomManager.updateRoom(gameId, { currentRound: localRound })

      // 轮次开始
      recordEvent(gameId, {
        type: 'round_start',
        payload: { round: localRound },
      })

      // 1. 发言阶段
      await runSpeakingPhase(gameId)
      if (roomManager.getRoom(gameId)?.status === 'finished') break

      // 发言→投票过渡倒计时 5 秒
      const transitionSec = 5
      for (let s = transitionSec; s >= 1; s--) {
        broadcast(gameId, 'phase_transition', {
          nextPhase: 'voting',
          remaining: s,
          round: localRound,
        })
        await sleep(1000)
      }

      // 2. 投票阶段
      await runVotingPhase(gameId)
      if (roomManager.getRoom(gameId)?.status === 'finished') break

      // 3. 淘汰 + 判胜
      const winner = await runEliminationPhase(gameId)
      if (winner) break

      // 4. 准备下一轮（保留 speeches 供 AI 参考全盘历史，仅清空投票）
      roomManager.updateRoom(gameId, {
        votes: [],
        status: 'speaking',
      })

      broadcast(gameId, 'next_round', {
        round: localRound + 1,
      })

      await sleep(2000)
    }
  } catch (err) {
    console.error(`[orchestrator] 游戏 ${gameId} 异常:`, err)
    broadcast(gameId, 'game_error', {
      message: '游戏运行异常，请重新开始',
    })
  } finally {
    roomManager.markLoopDone(gameId)
    console.log(`[orchestrator] 游戏结束: ${gameId}`)
  }
}
