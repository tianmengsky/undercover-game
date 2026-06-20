import { authService } from './auth.service.js'
import { registerSchema, loginSchema, refreshSchema } from './auth.schema.js'
import { authGuard } from './auth.guard.js'
import { success, error } from '../../shared/response.js'
import { AppError, ErrorCodes } from '../../shared/errors.js'
import { db } from '../../db/index.js'
import { users } from '../../db/schema/users.js'
import { eq } from 'drizzle-orm'
import { ZodError } from 'zod'

export async function authRoutes(app: any): Promise<void> {
  app.post('/api/auth/register', async (req, reply) => {
    try {
      const input = registerSchema.body.parse(req.body)
      const result = await authService.register(input)
      return success(result, '注册成功')
    } catch (e) {
      if (e instanceof ZodError) {
        reply.status(400)
        return error(40001, '参数校验失败：' + e.errors.map((err) => err.message).join('; '))
      }
      if (e instanceof AppError) {
        reply.status(e.statusCode)
        return error(e.code, e.message)
      }
      throw e
    }
  })

  app.post('/api/auth/login', async (req, reply) => {
    try {
      const input = loginSchema.body.parse(req.body)
      const result = await authService.login(input)
      return success(result, '登录成功')
    } catch (e) {
      if (e instanceof ZodError) {
        reply.status(400)
        return error(40001, '参数校验失败：' + e.errors.map((err) => err.message).join('; '))
      }
      if (e instanceof AppError) {
        reply.status(e.statusCode)
        return error(e.code, e.message)
      }
      throw e
    }
  })

  app.post('/api/auth/refresh', async (req, reply) => {
    try {
      const { refreshToken } = refreshSchema.body.parse(req.body)
      const result = await authService.refresh(refreshToken)
      return success(result, 'Token 已刷新')
    } catch (e) {
      if (e instanceof ZodError) {
        reply.status(400)
        return error(40001, '参数校验失败')
      }
      if (e instanceof AppError) {
        reply.status(e.statusCode)
        return error(e.code, e.message)
      }
      throw e
    }
  })

  app.get('/api/auth/me', { preHandler: [authGuard] }, async (req) => {
    const userId = (req as any).userId as string
    const rows = await db.select().from(users).where(eq(users.id, userId))
    const user = rows[0]
    if (!user) {
      return error(ErrorCodes.NOT_FOUND, '用户不存在')
    }
    return success({
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        level: user.level,
        exp: user.exp,
        totalGames: user.totalGames,
        wins: user.wins,
        mvpCount: user.mvpCount,
      },
    })
  })

  // 更新经验值（游戏结算后调用）
  app.patch('/api/auth/exp', { preHandler: [authGuard] }, async (req) => {
    const userId = (req as any).userId as string
    const body = req.body as { exp: number }
    if (body.exp === undefined) {
      return error(ErrorCodes.INVALID_PARAMS, '缺少 exp')
    }
    const level = Math.floor(body.exp / 100) + 1
    const ts = new Date()
    await db.update(users)
      .set({ level, exp: body.exp, updatedAt: ts } as any)
      .where(eq(users.id, userId))
    return success({ level, exp: body.exp })
  })
}
