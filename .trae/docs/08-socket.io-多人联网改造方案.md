# socket.io 多人联网改造方案（v2 - 可行性重评估后修正）

> 目标：将项目从 `@fastify/websocket` + 原生 `WebSocket` 迁移到 `socket.io`，获得自动重连、房间管理、心跳保活等开箱即用的能力。
>
> 依赖版本：`socket.io: ^4.8.3` / `socket.io-client: ^4.8.3`
>
> **v2 变更**：基于完整代码交叉分析，修正了 io 实例注入方式、broadcast 签名、sendTo 迁移等 3 处原方案问题。

---

## 一、改造范围

| 层级 | 文件 | 改动类型 | 说明 |
|------|------|----------|------|
| 服务端 | `server/package.json` | ✅ 已完成 | `-@fastify/websocket`, `+socket.io@^4.8.3` |
| 服务端 | `server/src/app.ts` | 改写 | 移除 `fastifyWebsocket` 注册；不再在此创建 io |
| 服务端 | `server/src/index.ts` | 改写 | 在 `app.listen()` 后创建 socket.io Server，注入到 manager |
| 服务端 | `server/src/modules/game/game.manager.ts` | 改写 | 新增 `setIO()` 注入；`broadcast` 签名改为 `(gameId, event, payload)`；删除 `gameConnections` / `addConnection` / `removeConnection` |
| 服务端 | `server/src/modules/game/game.orchestrator.ts` | 微调 | `broadcast()` wrapper 去掉 `{type,payload,timestamp}` 包装 |
| 服务端 | `server/src/modules/game/game.routes.ts` | 删除 WS 部分 | 移除 `/ws` 路由 handler（约 260 行），仅保留 REST 路由 |
| 服务端 | `server/src/modules/game/game.ws.ts` | **实现** | socket.io 事件处理器 |
| 客户端 | `client/package.json` | ✅ 已完成 | `+socket.io-client@^4.8.3` |
| 客户端 | `client/src/composables/useWebSocket.ts` | 改写 | 原生 WebSocket → socket.io-client |

**不改动的文件：**
- `client/src/types/ws.ts` —— 消息 payload 类型定义不变
- `client/src/views/GameView.vue` —— `send()` / `on()` 签名兼容，UI 层零改动
- `server/src/modules/game/game.ai.ts` / `game.replay.ts` —— 不涉及 WS
- `server/src/modules/game/game.engine.ts` —— xstate 状态机，不涉及传输层

---

## 二、改动细节

### 2.1 服务端 `app.ts`

**删除：** fastifyWebsocket 的 import 和 register。

```diff
- import fastifyWebsocket from '@fastify/websocket'
- await app.register(fastifyWebsocket)
```

**不再**在此文件创建 socket.io Server —— 原因见 2.2。

---

### 2.2 服务端 `index.ts` —— 修正点

**原方案问题：** `app.decorate()` 必须在 `ready()`/`listen()` 之前调用。而 `new Server(app.server)` 需要 `app.server` 在 ready 之后才确保存在。两者互斥。

**修正方案：** 使用模块级 setter 单例模式。

```ts
// index.ts
import { createApp } from './app.js'
import { Server } from 'socket.io'
import { setIO } from './modules/game/game.manager.js'

const app = await createApp()
await app.listen({ port, host })

// listen 后 app.server 可用，创建 socket.io 挂载到同一 HTTP Server
const io = new Server(app.server, {
  cors: { origin: env.CORS_ORIGIN },
  pingInterval: 25000,
  pingTimeout: 20000,
})

// 注入 io 实例到 game.manager，供 broadcast 等使用
setIO(io)

// 注册 socket.io 事件处理
import { registerWSHandlers } from './modules/game/game.ws.js'
registerWSHandlers(io)
```

**好处：** 不依赖 Fastify 内部 API，纯 JS 函数调用，无时序陷阱。

---

### 2.3 服务端 `game.manager.ts` —— 修正点

**原方案问题：** `broadcast(gameId, message)` 签名是 `{type, payload, timestamp}` 包装对象，而 socket.io 是 `emit(eventName, data)`。

**修正后完整改动：**

```ts
// ── 顶部新增 ──
import type { Server as SocketIOServer, Socket as SocketIOSocket } from 'socket.io'

let _io: SocketIOServer | null = null

/** 在 app.listen() 之后由 index.ts 调用 */
export function setIO(io: SocketIOServer): void {
  _io = io
}

// ── 删除 ──
// import type { WebSocket } from 'ws'    ← 移除
// const gameConnections = new Map<string, Set<WebSocket>>()  ← 移除，用 socket.io Room 替代

// ── 修改 broadcast 签名 ──
// 旧：
broadcast(gameId: string, message: object): void {
  const conns = gameConnections.get(gameId)
  if (!conns) return
  const data = JSON.stringify(message)
  for (const ws of conns) {
    if (ws.readyState === ws.OPEN) ws.send(data)
  }
}

// 新：
broadcast(gameId: string, event: string, payload: unknown): void {
  if (_io) _io.to(gameId).emit(event, payload)
}

// ── 删除 ──
// addConnection / removeConnection    ← 移除，socket.io Room 自动管理
// sendTo(ws, message)                 ← 移除，改为 socket.emit() 直接调用（在 game.ws.ts 中）

// ── 保留不变 ──
// rooms / createRoom / getRoom / updateRoom / removeRoom
// isLoopRunning / markLoopRunning / markLoopDone
// waitForHumanSpeech / resolveHumanSpeech
// waitForHumanVote / resolveHumanVote
```

**变化量：** 新增 1 个 `setIO()` 导出函数 + 约 5 行类型导入，删除约 30 行（`gameConnections`、`addConnection`、`removeConnection`、`sendTo`），修改 `broadcast` 约 1 行。

---

### 2.4 服务端 `game.orchestrator.ts` —— 修正点（新增）

**原方案遗漏：** orchestrator 文件内有自己的模块级 `broadcast()` wrapper，需要同步修改。

```ts
// 旧：包装成 { type, payload, timestamp } 再传给 roomManager.broadcast
function broadcast(gameId: string, type: string, payload: Record<string, unknown> = {}): void {
  roomManager.broadcast(gameId, { type, payload, timestamp: Date.now() })
}

// 新：直接透传 event name 和 payload
function broadcast(gameId: string, type: string, payload: Record<string, unknown> = {}): void {
  roomManager.broadcast(gameId, type, payload)
}
```

**改动仅 1 行**，其余 orchestrator 代码完全不变（所有 `broadcast(gameId, 'event_name', {...})` 调用点无需修改）。

---

### 2.5 服务端 `game.routes.ts`

**删除：** 整个 `/ws` 路由 handler（约 260 行，第 280 行到第 540 行左右的 `app.get('/ws', ...)` 块）。

**保留：** 所有 REST 路由（`POST /api/games`、`GET /api/games/:id`、`POST /api/games/:id/words/generate`、`POST /api/games/:id/start`、`GET /api/games/:id/result`、`GET /api/games/:id/replay`）。

**无需新增任何代码** —— 事件注册已移至 `index.ts` 中调用 `registerWSHandlers(io)`。

---

### 2.6 服务端 `game.ws.ts`（实现）

```ts
import { Server, Socket } from 'socket.io'
import { roomManager } from './game.manager.js'
import { authService } from '../auth/auth.service.js'

export function registerWSHandlers(io: Server): void {
  // ── 认证中间件 ──
  io.use((socket, next) => {
    const token = socket.handshake.auth.token
    const gameId = socket.handshake.auth.gameId
    if (!token || !gameId) return next(new Error('缺少 token 或 gameId'))
    try {
      authService.verifyAccessToken(token)
      next()
    } catch {
      next(new Error('token 无效'))
    }
  })

  io.on('connection', (socket) => {
    const gameId = socket.handshake.auth.gameId as string
    const slotIndex = (socket.handshake.auth.slotIndex as number) ?? -1

    const room = roomManager.getRoom(gameId)
    if (!room) {
      socket.emit('error', { message: '游戏不存在' })
      socket.disconnect()
      return
    }

    // 加入房间（替代旧的 addConnection）
    socket.join(gameId)

    // 发送当前游戏状态快照（与旧 WS handler 逻辑一致）
    const player = slotIndex >= 0 ? room.players[slotIndex] : undefined
    socket.emit('game_state', {
      gameId,
      status: room.status,
      currentRound: room.currentRound,
      maxRounds: room.maxRounds,
      players: room.players.map((p) => ({
        slotIndex: p.slotIndex,
        customName: p.customName,
        isAI: p.type === 'ai',
        isAlive: p.isAlive,
        aiPersona: p.aiPersona,
      })),
      currentSpeakerIndex: -1,
      yourSlotIndex: slotIndex,
      yourWord: player?.word ?? '',
      yourRole: player?.role ?? '',
      speeches: room.speeches || [],
    })

    // ── 客户端事件处理 ──
    socket.on('player_speech', (payload: { gameId: string; content: string }) => {
      const content = payload?.content || ''
      if (content.length < 2 || content.length > 100) {
        socket.emit('error', { message: '发言内容需 2-100 字符' })
        return
      }
      roomManager.resolveHumanSpeech(gameId, content)
    })

    socket.on('cast_vote', (payload: { gameId: string; targetSlotIndex: number }) => {
      const target = payload?.targetSlotIndex
      if (target === undefined || target === null) {
        socket.emit('error', { message: '请指定投票目标' })
        return
      }
      roomManager.resolveHumanVote(gameId, target)
    })

    socket.on('toggle_tts', (payload: { enabled: boolean }) => {
      io.to(gameId).emit('tts_toggle', { enabled: payload?.enabled ?? false })
    })

    // disconnect 时 socket.io 自动离开所有 room，无需手动清理
  })
}
```

**与旧 `/ws` handler 的映射关系：**

| 旧 WS 代码 | 新 socket.io 代码 |
|-----------|------------------|
| URL query `?token=xxx&gameId=yyy` | `socket.handshake.auth.token` / `.gameId` |
| `socket.send(JSON.stringify({ type: 'game_state', ... }))` | `socket.emit('game_state', { ... })` |
| `socket.on('message', raw => { ... })` + switch-case | `socket.on('player_speech', ...)` / `socket.on('cast_vote', ...)` |
| `roomManager.sendTo(socket, { type: 'error', ... })` | `socket.emit('error', { ... })` |
| `setInterval(ping, 30_000)` + socket.on('close') cleanup | socket.io 内置 ping/pong + 自动清理 |

---

### 2.7 客户端 `useWebSocket.ts`

**删除的逻辑：**
- 手动指数退避重连（`reconnectAttempt`、`maxReconnect`、递归 `setTimeout`）
- 手动心跳定时器（`pingTimer`、`startHeartbeat`、`stopHeartbeat`）
- `new WebSocket(url)` 的 `onopen`/`onclose`/`onerror` 回调
- `registerDefaultHandlers()` 中的 `handlers.set(...)` —— 改为直接 `socket.on(event, fn)`
- `connect()` 中的 URL 拼接 + query string

**改动后核心代码骨架：**

```ts
import { io, Socket } from 'socket.io-client'
import { ref, onUnmounted } from 'vue'

export function useWebSocket() {
  const socket = ref<Socket | null>(null)
  const isConnected = ref(false)

  // ── 连接 ──
  function connect(gameId: string, slotIndex?: number) {
    const token = authStore.token
    if (!token || !gameId) return

    socket.value = io('http://localhost:3456', {
      auth: { token, gameId, slotIndex },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 16000,
    })

    socket.value.on('connect', () => { isConnected.value = true })
    socket.value.on('disconnect', () => { isConnected.value = false })

    // 注册默认消息处理器（与当前 registerDefaultHandlers 一一对应）
    socket.value.on('game_state', (p) => gameStore.setGameState(p))
    socket.value.on('game_started', (p) => { gameStore.setGameState(p); gameStore.setPhase('speaking') })
    socket.value.on('phase_change', (p) => gameStore.setPhase(p.phase))
    socket.value.on('current_speaker', (p) => gameStore.setCurrentSpeaker(p.slotIndex))
    // ... 其余 handler 与当前完全一致，只是从 handlers.set('key', [fn]) 改为 socket.value.on('key', fn)
  }

  // ── 发送 ──
  function send(type: string, payload: unknown = {}) {
    if (socket.value?.connected) {
      socket.value.emit(type, payload)
    }
  }

  // ── 注册自定义 handler ──
  function on(type: string, handler: (payload: unknown) => void) {
    socket.value?.on(type, handler)
  }

  // ── 断开 ──
  function disconnect() {
    socket.value?.disconnect()
    socket.value = null
    isConnected.value = false
  }

  onUnmounted(() => disconnect())

  return { isConnected, connect, disconnect, send, on }
}
```

**导出接口保持不变：** `{ isConnected, connect, disconnect, send, on }`

---

## 三、实施步骤

按依赖顺序分 6 步：

```
1. 安装依赖 → 验证: npm ls socket.io / socket.io-client 无报错    ✅ 已完成
2. 改造 app.ts + index.ts → 验证: server 能启动，/api/health 正常
3. 改造 game.manager.ts → 验证: 编译通过，broadcast/human resolver 逻辑不变
4. 实现 game.ws.ts → 验证: 客户端能连接、认证、收到 game_state 快照
5. 改造 game.orchestrator.ts (1行) + game.routes.ts（删除 /ws）→ 验证: REST 路由不受影响
6. 改造 useWebSocket.ts → 验证: GameView 正常跑完一局完整流程
```

---

## 四、风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| socket.io 与 Fastify HTTP Server 兼容性 | 低 | 高 | socket.io v4 支持挂载到任意 `http.Server`；在 `listen()` 后创建，此时 `app.server` 已确保存在 |
| `broadcast` 语义变化导致事件丢失 | 低 | 中 | `io.to(room).emit(event, data)` 向房间内所有 socket 发送（包含发送者）。orchestrator 是服务端主动推送，不存在"广播排除发送者"场景 |
| 客户端 `on()` 多次注册导致 handler 累积 | 低 | 低 | 与当前行为一致：`disconnect()` 时需清理自定义 handler。socket.io-client 的 `socket.disconnect()` 会自动解绑所有 listener |
| `speechResolvers` / `voteResolvers` 并发问题 | 无 | — | 纯 Promise resolver，不涉及传输层协议 |

---

## 五、不变与兼容保证

| 项目 | 状态 |
|------|------|
| 消息 payload 类型定义 (`client/src/types/ws.ts`) | 不变 |
| `GameView.vue` 的 `send()` / `on()` 调用 | 不变 |
| `game.orchestrator.ts` 除 1 行 `broadcast` wrapper 外所有逻辑 | 不变 |
| `game.ai.ts` / `game.replay.ts` / `game.engine.ts` | 不变 |
| 所有 REST 路由 (`POST/GET /api/games/*`) | 不变 |
| `useWebSocket` 导出接口 `{ isConnected, connect, disconnect, send, on }` | 不变 |

---

## 六、代码删除量 vs 新增量

| 文件 | 删除 | 新增 | 净变化 |
|------|------|------|--------|
| `app.ts` | 2 行 | 0 | -2 |
| `index.ts` | 0 行 | ~8 行 | +8 |
| `game.manager.ts` | ~35 行 | ~6 行 | -29 |
| `game.orchestrator.ts` | 1 行改 | 1 行 | 0 |
| `game.routes.ts` | ~260 行 | 0 | -260 |
| `game.ws.ts` | 0 | ~70 行 | +70 |
| `useWebSocket.ts` | ~80 行（重连/心跳） | ~60 行 | -20 |

**总计：删除约 378 行，新增约 145 行，净减少约 233 行。**
