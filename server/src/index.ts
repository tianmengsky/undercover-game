import 'dotenv/config'
import { loadEnv, getEnv } from './config/env.js'
import { createApp } from './app.js'
import { seedDatabase } from './db/index.js'
import { Server } from 'socket.io'
import { setIO } from './modules/game/game.manager.js'
import { registerWSHandlers } from './modules/game/game.ws.js'

// 加载环境变量（必须在最前面）
loadEnv()

// 初始化种子数据（成就定义 + 官方人设，幂等）
seedDatabase()

const app = await createApp()
const env = getEnv()

const port = parseInt(process.env.PORT || '3456', 10)

try {
  await app.listen({ port, host: '0.0.0.0' })

  // 在 listen 后创建 socket.io，挂载到 Fastify 底层 HTTP Server
  const io = new Server(app.server, {
    cors: { origin: env.CORS_ORIGIN },
    pingInterval: 25000,
    pingTimeout: 20000,
  })

  // 注入 io 实例到 game.manager，供 broadcast 使用
  setIO(io)

  // 注册 socket.io 事件处理
  registerWSHandlers(io)

  app.log.info(`Server running at http://localhost:${port}`)
  app.log.info(`Socket.IO available at ws://localhost:${port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
