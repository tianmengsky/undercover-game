import Fastify from 'fastify'
import fastifyCors from '@fastify/cors'
import fastifyHelmet from '@fastify/helmet'
import fastifyRateLimit from '@fastify/rate-limit'
import { getEnv } from './config/env.js'
import { authRoutes } from './modules/auth/auth.routes.js'
import { gameRoutes } from './modules/game/game.routes.js'
import { roomRoutes } from './modules/game/game.rooms.js'
import { statsRoutes } from './modules/stats/stats.routes.js'
import { personaRoutes } from './modules/persona/persona.routes.js'

export async function createApp() {
  const env = getEnv()
  // @ts-expect-error fastify 5 default export 与 bundler moduleResolution 的类型兼容问题，运行时正常
  const app = Fastify({
    logger: {
      transport:
        env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  })

  // 插件注册
  await app.register(fastifyCors, {
    origin: env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  })
  await app.register(fastifyHelmet)
  await app.register(fastifyRateLimit, { max: 100, timeWindow: '1 minute' })

  // 模块路由
  await app.register(authRoutes)
  await app.register(gameRoutes)
  await app.register(roomRoutes)
  await app.register(statsRoutes)
  await app.register(personaRoutes)

  // 健康检查
  app.get('/api/health', async () => ({ status: 'ok', timestamp: Date.now() }))

  // 全局错误处理
  app.setErrorHandler((err: any, _req, reply) => {
    app.log.error(err)
    reply.status(err.statusCode || 500).send({
      code: 50000,
      message: env.NODE_ENV === 'production' ? '服务器内部错误' : err.message,
      data: null,
    })
  })

  return app
}
