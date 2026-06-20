import { success, error } from '../../shared/response.js'
import { ErrorCodes } from '../../shared/errors.js'
import * as statsService from './stats.service.js'
import { ACHIEVEMENTS } from './stats.service.js'
import { authGuard } from '../auth/auth.guard.js'

export async function statsRoutes(app: any): Promise<void> {
  // ═══════════════════════════════════════
  // GET /api/stats/leaderboard（公开）
  // ═══════════════════════════════════════
  app.get('/api/stats/leaderboard', async (req) => {
    const query = req.query as { type?: string; page?: string; pageSize?: string }
    const type = (query.type || 'total') as 'total' | 'weekly' | 'monthly'
    const page = Math.max(1, Number(query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20))

    return success(await statsService.getLeaderboard(type, page, pageSize))
  })

  // ═══════════════════════════════════════
  // GET /api/stats/user/:id（公开）
  // ═══════════════════════════════════════
  app.get('/api/stats/user/:id', async (req) => {
    const { id } = req.params as { id: string }
    const stats = await statsService.getUserStats(id)
    if (!stats) {
      return error(ErrorCodes.NOT_FOUND, '用户无统计数据')
    }
    return success(stats)
  })

  // ═══════════════════════════════════════
  // GET /api/users/:id/history（需鉴权）
  // ═══════════════════════════════════════
  app.get('/api/users/:id/history', { preHandler: authGuard }, async (req) => {
    const { id } = req.params as { id: string }
    const query = req.query as { page?: string; pageSize?: string }
    const page = Math.max(1, Number(query.page) || 1)
    const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 10))

    return success(await statsService.getUserHistory(id, page, pageSize))
  })

  // ═══════════════════════════════════════
  // GET /api/stats/achievements（公开）
  // ═══════════════════════════════════════
  app.get('/api/stats/achievements', async () => {
    return success({ achievements: ACHIEVEMENTS })
  })

  // ═══════════════════════════════════════
  // GET /api/users/:id/achievements（公开）
  // ═══════════════════════════════════════
  app.get('/api/users/:id/achievements', async (req) => {
    const { id } = req.params as { id: string }
    return success({ achievements: await statsService.getUserAchievements(id) })
  })

  // ═══════════════════════════════════════
  // GET /api/stats/daily-challenge（公开）
  // ═══════════════════════════════════════
  app.get('/api/stats/daily-challenge', async () => {
    return success({
      date: new Date().toISOString().slice(0, 10),
      challenges: [
        { id: 'win_today', name: '今日首胜', description: '今天获得一场胜利', rewardExp: 30 },
        { id: 'play_today', name: '每日一局', description: '今天完成一局游戏', rewardExp: 15 },
      ],
    })
  })
}
