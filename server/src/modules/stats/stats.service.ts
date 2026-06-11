/**
 * stats.service.ts — 排行榜/统计服务
 *
 * 存储: SQLite（Drizzle ORM + raw SQLite）
 *
 * 计分公式:
 *   score = wins*100 + mvpCount*50 + correctVotes*20
 *         + undercoverWins*50 + survivalCount*30
 */
import crypto from 'node:crypto'
import { eq, desc, sql } from 'drizzle-orm'
import { db, updateUserStats, insertGamePlayer, sqlite as rawDb } from '../../db/index.js'
import { users } from '../../db/schema/users.js'
import { gameRecords } from '../../db/schema/game_records.js'
import { gamePlayers } from '../../db/schema/game_players.js'

// ═══════════════════════════════════
// 类型
// ═══════════════════════════════════

export interface GameResult {
  userId: string
  nickname: string
  won: boolean
  role: 'civilian' | 'undercover'
  survivedRounds: number
  isMvp: boolean
  correctVotes: number
  wordPair: string
  totalRounds: number
}

export interface UserStats {
  userId: string
  nickname: string
  totalGames: number
  wins: number
  mvpCount: number
  totalExp: number
  level: number
  undercoverWins: number
  survivalCount: number
  correctVotes: number
  score: number
}

export interface AchievementUnlock {
  id: string
  name: string
  icon: string
  unlockedAt: number
  rewardExp: number
}

export interface AchievementCheckResult {
  gameResult: {
    won: boolean
    role: 'civilian' | 'undercover'
    survivedRounds: number
    isMvp: boolean
    correctVotes: number
    totalVotes: number
    eliminatedUndercoverRound: number
  }
  userStats: UserStats
}

// ═══════════════════════════════════
// 成就定义
// ═══════════════════════════════════

export const ACHIEVEMENTS = [
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

const expMap = new Map(ACHIEVEMENTS.map((a) => [a.id, a.rewardExp]))

// ═══════════════════════════════════
// 经验值 / 等级 计算
// ═══════════════════════════════════

export function calcExpGained(result: { won: boolean; survivedRounds: number; isMvp: boolean; role: 'civilian' | 'undercover' }): number {
  let exp = 20
  if (result.won) exp += 30
  exp += result.survivedRounds * 5
  if (result.isMvp) exp += 20
  if (result.role === 'undercover' && result.won) exp *= 3
  return exp
}

export function calcLevel(totalExp: number): number {
  return Math.floor(Math.sqrt(totalExp / 100)) + 1
}

function calcScore(u: { wins: number; mvpCount: number; correctVotes: number; undercoverWins: number; survivalCount: number }): number {
  return u.wins * 100 + u.mvpCount * 50 + u.correctVotes * 20 + u.undercoverWins * 50 + u.survivalCount * 30
}

// ═══════════════════════════════════
// 记录战绩
// ═══════════════════════════════════

export function recordGame(result: GameResult): UserStats {
  const user = db.select({
    id: users.id, nickname: users.nickname, exp: users.exp,
    totalGames: users.totalGames, wins: users.wins, mvpCount: users.mvpCount,
    undercoverWins: users.undercoverWins, survivalCount: users.survivalCount,
    correctVotes: users.correctVotes, winStreak: users.winStreak,
  }).from(users).where(eq(users.id, result.userId)).get()

  if (!user) {
    return { userId: result.userId, nickname: result.nickname, totalGames: 0, wins: 0, mvpCount: 0, totalExp: 0, level: 1, undercoverWins: 0, survivalCount: 0, correctVotes: 0, score: 0 }
  }

  const gained = calcExpGained({ won: result.won, survivedRounds: result.survivedRounds, isMvp: result.isMvp, role: result.role })
  const newTotalGames = user.totalGames + 1
  const newWins = result.won ? user.wins + 1 : user.wins
  const newMvp = result.isMvp ? user.mvpCount + 1 : user.mvpCount
  const newUndercoverWins = (result.role === 'undercover' && result.won) ? user.undercoverWins + 1 : user.undercoverWins
  const newSurvival = result.survivedRounds > 0 ? user.survivalCount + 1 : user.survivalCount
  const newCorrectVotes = user.correctVotes + result.correctVotes
  const newExp = user.exp + gained
  const newLevel = calcLevel(newExp)
  const newWinStreak = result.won ? user.winStreak + 1 : 0

  updateUserStats(result.userId, {
    nickname: result.nickname,
    totalGames: newTotalGames, wins: newWins, mvpCount: newMvp,
    undercoverWins: newUndercoverWins, survivalCount: newSurvival,
    correctVotes: newCorrectVotes, exp: newExp, level: newLevel,
    winStreak: newWinStreak,
    updatedAt: new Date().toISOString(),
  })

  const gameId = crypto.randomUUID()
  const now = new Date().toISOString()
  db.insert(gameRecords).values({
    id: gameId,
    civilianWord: result.wordPair.split('/')[0],
    undercoverWord: result.wordPair.split('/')[1] || '',
    winner: result.won ? result.role : (result.role === 'civilian' ? 'undercover' : 'civilian'),
    totalRounds: result.totalRounds, createdAt: now, finishedAt: now,
  }).run()

  insertGamePlayer({
    id: crypto.randomUUID(), gameId, userId: result.userId,
    slotIndex: 0, role: result.role,
    isAlive: result.survivedRounds >= result.totalRounds ? 1 : 0,
    isMvp: result.isMvp ? 1 : 0, survivalRounds: result.survivedRounds,
    correctVotes: result.correctVotes, expGained: gained, createdAt: now,
  })

  return {
    userId: result.userId, nickname: result.nickname,
    totalGames: newTotalGames, wins: newWins, mvpCount: newMvp,
    totalExp: newExp, level: newLevel, undercoverWins: newUndercoverWins,
    survivalCount: newSurvival, correctVotes: newCorrectVotes,
    score: calcScore({ wins: newWins, mvpCount: newMvp, correctVotes: newCorrectVotes, undercoverWins: newUndercoverWins, survivalCount: newSurvival }),
  }
}

// ═══════════════════════════════════
// 排行榜
// ═══════════════════════════════════

export function getLeaderboard(_type: 'total' | 'weekly' | 'monthly', page: number, pageSize: number) {
  const allUsers = db.select({
    userId: users.id, nickname: users.nickname, level: users.level,
    totalGames: users.totalGames, wins: users.wins, mvpCount: users.mvpCount,
    undercoverWins: users.undercoverWins, survivalCount: users.survivalCount,
    correctVotes: users.correctVotes,
  }).from(users).all()

  const list = allUsers
    .map((u) => ({ ...u, score: calcScore(u), winRate: u.totalGames > 0 ? Math.round((u.wins / u.totalGames) * 100) / 100 : 0 }))
    .sort((a, b) => b.score - a.score)
    .map((s, i) => ({ rank: i + 1, ...s }))

  const total = list.length
  const start = (page - 1) * pageSize
  return { list: list.slice(start, start + pageSize), total, page, pageSize }
}

export function getUserStats(userId: string): UserStats | undefined {
  const u = db.select().from(users).where(eq(users.id, userId)).get()
  if (!u) return undefined
  return {
    userId: u.id, nickname: u.nickname, totalGames: u.totalGames,
    wins: u.wins, mvpCount: u.mvpCount, totalExp: u.exp, level: u.level,
    undercoverWins: u.undercoverWins, survivalCount: u.survivalCount,
    correctVotes: u.correctVotes, score: calcScore(u),
  }
}

export function getUserHistory(userId: string, page: number, pageSize: number) {
  const rows = db.select({
    gameId: gamePlayers.gameId, role: gamePlayers.role,
    winner: gameRecords.winner,
    wordPair: sql<string>`${gameRecords.civilianWord} || '/' || ${gameRecords.undercoverWord}`,
    totalRounds: gameRecords.totalRounds, isMvp: gamePlayers.isMvp,
    expGained: gamePlayers.expGained, finishedAt: gameRecords.finishedAt,
  }).from(gamePlayers).innerJoin(gameRecords, eq(gamePlayers.gameId, gameRecords.id))
    .where(eq(gamePlayers.userId, userId)).orderBy(desc(gameRecords.finishedAt)).all()

  const total = rows.length
  const start = (page - 1) * pageSize
  const list = rows.slice(start, start + pageSize).map((r) => ({
    ...r,
    winner: r.role === 'civilian'
      ? (r.winner === 'civilian' ? 'civilian' : 'undercover')
      : (r.winner === 'undercover' ? 'undercover' : 'civilian'),
  }))
  return { list, total, page, pageSize }
}

// ═══════════════════════════════════
// 成就检测（DB 持久化）
// ═══════════════════════════════════

/** 读用户已解锁的成就 */
export function getUserAchievements(userId: string): AchievementUnlock[] {
  const rows = rawDb.prepare(
    'SELECT ua.achievement_id as id, a.name, a.icon, ua.unlocked_at FROM user_achievements ua JOIN achievements a ON ua.achievement_id = a.id WHERE ua.user_id = ?'
  ).all(userId) as any[]
  return rows.map((r) => ({ id: r.id, name: r.name, icon: r.icon, unlockedAt: Number(r.unlocked_at), rewardExp: expMap.get(r.id) || 0 }))
}

export function getAchievementDefinitions() {
  return ACHIEVEMENTS
}

/** 写入成就解锁 + 加经验，返回成就对象 */
function writeUnlock(userId: string, achId: string, name: string, icon: string): AchievementUnlock {
  const rewardExp = expMap.get(achId) || 0
  const now = Date.now()
  rawDb.prepare('INSERT OR IGNORE INTO user_achievements (id, user_id, achievement_id, game_id, unlocked_at) VALUES (?, ?, ?, NULL, ?)')
    .run(crypto.randomUUID(), userId, achId, String(now))
  if (rewardExp > 0) {
    const row = rawDb.prepare('SELECT exp FROM users WHERE id = ?').get(userId) as any
    const newExp = (row?.exp || 0) + rewardExp
    updateUserStats(userId, { exp: newExp, level: calcLevel(newExp) })
  }
  return { id: achId, name, icon, unlockedAt: now, rewardExp }
}

export function checkAchievements(
  userId: string,
  input: AchievementCheckResult,
): AchievementUnlock[] {
  const { gameResult, userStats } = input
  const unlockedRows = rawDb.prepare('SELECT achievement_id FROM user_achievements WHERE user_id = ?').all(userId) as any[]
  const unlockedIds = new Set(unlockedRows.map((r: any) => r.achievement_id))
  const newlyUnlocked: AchievementUnlock[] = []

  function tryUnlock(id: string, name: string, icon: string): boolean {
    if (unlockedIds.has(id)) return false
    const u = writeUnlock(userId, id, name, icon)
    unlockedIds.add(id)
    newlyUnlocked.push(u)
    userStats.totalExp += u.rewardExp
    userStats.level = calcLevel(userStats.totalExp)
    return true
  }

  if (userStats.totalGames >= 1) tryUnlock('first_blood', '初出茅庐', '🎯')
  if (gameResult.eliminatedUndercoverRound === 1) tryUnlock('sharp_eye', '火眼金睛', '👁️')
  if (gameResult.totalVotes > 0 && gameResult.correctVotes === gameResult.totalVotes) {
    tryUnlock('perfect_vote', '百发百中', '🎯')
  }
  if (gameResult.role === 'undercover' && gameResult.won) tryUnlock('undercover_king', '伪装大师', '🎭')
  if (gameResult.role === 'civilian' && gameResult.survivedRounds >= 5) tryUnlock('survivor', '幸存者', '🛡️')
  if (userStats.mvpCount >= 5) tryUnlock('mvp_5', '决胜之星', '⭐')
  if (userStats.totalGames >= 50) tryUnlock('veteran', '沙场老兵', '🏅')

  if (gameResult.won) {
    const row = rawDb.prepare('SELECT win_streak FROM users WHERE id = ?').get(userId) as any
    const streak = (row?.win_streak || 0) + 1
    if (streak >= 3) tryUnlock('win_streak_3', '三连胜', '🔥')
  }

  if (unlockedRows.length + newlyUnlocked.length >= 8 && !unlockedIds.has('collector')) {
    tryUnlock('collector', '成就猎人', '🏅')
  }

  return newlyUnlocked
}

/** 记录使用的词语对（用于 word_master 成就） */
export function registerWordPair(userId: string, wordPair: string): void {
  const row = rawDb.prepare('SELECT used_words_count FROM users WHERE id = ?').get(userId) as any
  const count = (row?.used_words_count || 0) + 1
  updateUserStats(userId, { usedWordsCount: count })
  if (count >= 20) {
    const existing = rawDb.prepare('SELECT 1 FROM user_achievements WHERE user_id = ? AND achievement_id = ?').get(userId, 'word_master')
    if (!existing) {
      writeUnlock(userId, 'word_master', '词语大师', '📚')
    }
  }
}

// ═══════════════════════════════════
// 人设相关成就检测
// ═══════════════════════════════════

export function checkPersonaCreator(userId: string): AchievementUnlock | null {
  const existing = rawDb.prepare('SELECT 1 FROM user_achievements WHERE user_id = ? AND achievement_id = ?').get(userId, 'persona_creator')
  if (existing) return null
  const u = writeUnlock(userId, 'persona_creator', '造物主', '🪄')
  recheckCollector(userId)
  return u
}

export function checkPersonaStar(authorId: string): AchievementUnlock | null {
  const existing = rawDb.prepare('SELECT 1 FROM user_achievements WHERE user_id = ? AND achievement_id = ?').get(authorId, 'persona_star')
  if (existing) return null
  const u = writeUnlock(authorId, 'persona_star', '人设之星', '✨')
  recheckCollector(authorId)
  return u
}

function recheckCollector(userId: string): void {
  const row = rawDb.prepare('SELECT count(*) as c FROM user_achievements WHERE user_id = ?').get(userId) as any
  if (row.c >= 8) {
    writeUnlock(userId, 'collector', '成就猎人', '🏅')
  }
}
