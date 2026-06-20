import { success, error } from '../../shared/response.js'
import { ErrorCodes } from '../../shared/errors.js'
import * as personaService from './persona.service.js'
import { authGuard } from '../auth/auth.guard.js'
import { db } from '../../db/index.js'
import { users } from '../../db/schema/users.js'
import { eq } from 'drizzle-orm'
import { checkPersonaCreator } from '../stats/stats.service.js'

export async function personaRoutes(app: any): Promise<void> {
  // ═══════════════════════════════════════
  // POST /api/personas — 创建人设
  // ═══════════════════════════════════════
  app.post('/api/personas', { preHandler: authGuard }, async (req) => {
    const body = req.body as { description: string; name?: string; systemPrompt?: string; voiceName?: string; voicePitch?: number; voiceRate?: number; voiceVolume?: number }
    const userId = (req as any).userId as string
    const isExpertMode = !!(body.name && body.systemPrompt)

    if (!body.description || typeof body.description !== 'string') {
      return error(ErrorCodes.NOT_FOUND, '请提供人设描述')
    }

    if (isExpertMode && (!body.name || body.name.trim().length < 1)) {
      return error(ErrorCodes.NOT_FOUND, '专家模式下请填写人设名称')
    }
    if (isExpertMode && (!body.systemPrompt || body.systemPrompt.trim().length < 10)) {
      return error(ErrorCodes.NOT_FOUND, '专家模式下 System Prompt 至少 10 个字')
    }
    if (!isExpertMode && body.description.trim().length < 5) {
      return error(ErrorCodes.NOT_FOUND, '描述太短，请至少写 5 个字')
    }

    const limit = await personaService.checkMonthlyLimit(userId)
    if (!limit.allowed) {
      return error(ErrorCodes.FORBIDDEN, `每月最多创建 ${limit.max} 个人设，您已用 ${limit.current}/${limit.max}`)
    }

    // 从数据库获取昵称
    const userRows = await db.select().from(users).where(eq(users.id, userId))
    const authorName = userRows[0]?.nickname || '匿名玩家'

    try {
      const persona = await personaService.createPersona(
        userId,
        authorName,
        body.description.trim(),
        body.name?.trim() || undefined,
        body.systemPrompt?.trim() || undefined,
        body.voiceName?.trim() || undefined,
        body.voicePitch,
        body.voiceRate,
        body.voiceVolume,
      )
      return success({
        id: persona.id,
        name: persona.name,
        description: persona.description,
        systemPrompt: persona.systemPrompt,
        authorName: persona.authorName,
        usageCount: persona.usageCount,
        likeCount: persona.likeCount,
        isPublic: persona.isPublic,
        createdAt: new Date(persona.createdAt).toISOString(),
        voiceName: persona.voiceName,
        voicePitch: persona.voicePitch,
        voiceRate: persona.voiceRate,
        voiceVolume: persona.voiceVolume,
        newAchievement: await checkPersonaCreator(userId) || undefined,
      }, '人设创建成功')
    } catch (e: any) {
      return error(ErrorCodes.INTERNAL, e.message)
    }
  })

  // ═══════════════════════════════════════
  // GET /api/personas — 公共人设工坊
  // ═══════════════════════════════════════
  app.get('/api/personas', { preHandler: authGuard }, async (req) => {
    const query = req.query as { sort?: string; page?: string; pageSize?: string }
    const sort = query.sort === 'new' ? 'new' : 'popular'
    const page = Math.max(1, Number(query.page) || 1)
    const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 20))

    const result = await personaService.getPublicPersonas(sort, page, pageSize)
    return success({
      page,
      pageSize,
      total: result.total,
      list: result.list.map((p) => ({
        ...p,
        createdAt: new Date(p.createdAt).toISOString(),
      })),
    })
  })

  // ═══════════════════════════════════════
  // GET /api/personas/my — 我创建的人设
  // ═══════════════════════════════════════
  app.get('/api/personas/my', { preHandler: authGuard }, async (req) => {
    const userId = (req as any).userId as string
    const list = await personaService.getUserPersonas(userId)
    return success({
      list: list.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        systemPrompt: p.systemPrompt,
        usageCount: p.usageCount,
        likeCount: p.likeCount,
        isPublic: p.isPublic,
        createdAt: new Date(p.createdAt).toISOString(),
        voiceName: p.voiceName,
        voicePitch: p.voicePitch,
        voiceRate: p.voiceRate,
        voiceVolume: p.voiceVolume,
      })),
    })
  })

  // ═══════════════════════════════════════
  // POST /api/personas/:id/like — 点赞
  // ═══════════════════════════════════════
  app.post('/api/personas/:id/like', { preHandler: authGuard }, async (req) => {
    const { id } = req.params as { id: string }
    const userId = (req as any).userId as string

    const persona = await personaService.getPersona(id)
    if (!persona) {
      return error(ErrorCodes.GAME_NOT_FOUND, '人设不存在')
    }

    try {
      const ok = await personaService.likePersona(id, userId)
      return success({
        likeCount: ok ? persona.likeCount + 1 : persona.likeCount,
        liked: ok,
      })
    } catch (err: any) {
      req.log.error({ personaId: id, userId, err: err.message }, 'likePersona failed')
      return error(ErrorCodes.INTERNAL, '点赞失败，请稍后重试')
    }
  })

  // ═══════════════════════════════════════
  // DELETE /api/personas/:id — 删除人设
  // ═══════════════════════════════════════
  app.delete('/api/personas/:id', { preHandler: authGuard }, async (req) => {
    const { id } = req.params as { id: string }
    const userId = (req as any).userId as string

    const persona = await personaService.getPersona(id)
    if (!persona) {
      return error(ErrorCodes.GAME_NOT_FOUND, '人设不存在')
    }

    const ok = await personaService.deletePersona(id, userId)
    if (!ok) {
      return error(ErrorCodes.FORBIDDEN, '只能删除自己创建的人设')
    }

    return success(null, '人设已删除')
  })
}
