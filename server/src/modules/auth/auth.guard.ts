import type { FastifyRequest, FastifyReply } from 'fastify'
import { authService } from './auth.service.js'
import { ErrorCodes } from '../../shared/errors.js'

export async function authGuard(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    reply.status(401).send({
      code: ErrorCodes.UNAUTHORIZED,
      message: '请先登录',
      data: null,
    })
    return
  }

  const token = authHeader.slice(7)
  try {
    const payload = authService.verifyAccessToken(token)
    request.userId = payload.sub
  } catch {
    reply.status(401).send({
      code: ErrorCodes.TOKEN_EXPIRED,
      message: '登录已过期，请重新登录',
      data: null,
    })
  }
}
