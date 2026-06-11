# AI谁是卧底大乱斗 — API 接口设计文档

---

## 一、通用约定

### 1.1 基准 URL
```
开发环境: http://localhost:3456/api
生产环境: https://your-domain.com/api
Socket.IO: http://localhost:3456（与服务端同一端口）
```

### 1.2 通用响应格式

```json
{
  "code": 0,
  "message": "success",
  "data": { ... }
}
```

错误响应：

```json
{
  "code": 40101,
  "message": "用户名或密码错误",
  "data": null
}
```

### 1.3 错误码规范

| 范围 | 说明 |
|------|------|
| 0 | 成功 |
| 400xx | 请求参数错误 |
| 401xx | 认证相关错误 |
| 403xx | 权限不足 |
| 404xx | 资源不存在 |
| 409xx | 业务冲突（如重复操作） |
| 500xx | 服务端错误 |

### 1.4 认证头

```
Authorization: Bearer <access_token>
```

### 1.5 分页参数

```json
{
  "page": 1,
  "pageSize": 20,
  "total": 150,
  "list": []
}
```

---

## 二、认证模块 `/api/auth`

### 2.1 注册

```
POST /api/auth/register
```

**请求体：**

```json
{
  "username": "player123",
  "password": "Abc@123456",
  "nickname": "推理达人"
}
```

**校验规则：**
- `username`: 3-20 字符，字母数字下划线
- `password`: 6-30 字符，至少含字母+数字
- `nickname`: 2-12 字符（可选，默认同 username）

**响应：**

```json
{
  "code": 0,
  "message": "注册成功",
  "data": {
    "user": {
      "id": "uuid",
      "username": "player123",
      "nickname": "推理达人",
      "level": 1,
      "exp": 0
    },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

---

### 2.2 登录

```
POST /api/auth/login
```

**请求体：**

```json
{
  "username": "player123",
  "password": "Abc@123456"
}
```

**响应：**

```json
{
  "code": 0,
  "message": "登录成功",
  "data": {
    "user": {
      "id": "uuid",
      "username": "player123",
      "nickname": "推理达人",
      "avatarUrl": "https://...",
      "level": 5,
      "exp": 320
    },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

---

### 2.3 刷新 Token

```
POST /api/auth/refresh
```

**请求体：**

```json
{
  "refreshToken": "eyJhbG..."
}
```

**响应：**

```json
{
  "code": 0,
  "message": "Token 已刷新",
  "data": {
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

---

### 2.4 获取当前用户

```
GET /api/auth/me
Authorization: Bearer <token>
```

**响应：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "user": {
      "id": "uuid",
      "username": "player123",
      "nickname": "推理达人",
      "avatarUrl": "https://...",
      "level": 5,
      "exp": 320,
      "totalGames": 28,
      "wins": 18,
      "mvpCount": 7,
      "createdAt": "2026-01-01T00:00:00Z"
    }
  }
}
```

---

## 三、游戏模块 `/api/games`

### 3.1 创建游戏

```
POST /api/games
Authorization: Bearer <token>
```

**请求体：**

```json
{
  "players": [
    {
      "slotIndex": 0,
      "type": "human",
      "customName": "柯南"
    },
    {
      "slotIndex": 1,
      "type": "ai",
      "persona": "humor",
      "customName": "AI小丑"
    },
    {
      "slotIndex": 2,
      "type": "ai",
      "persona": "logic"
    },
    {
      "slotIndex": 3,
      "type": "ai",
      "persona": "newbie"
    },
    {
      "slotIndex": 4,
      "type": "ai",
      "persona": "literary"
    },
    {
      "slotIndex": 5,
      "type": "ai",
      "persona": "grumpy"
    }
  ],
  "civilianWord": "苹果",
  "undercoverWord": "梨子",
  "ttsEnabled": true
}
```

**说明：**
- `slotIndex`: 0-5，必须填满 6 个
- `type`: `"human"` / `"ai"`，目前限制 1 个 human
- `persona`: AI 人设 ID（见后端架构文档 5.4 节）
- `customName`: 可选，自定义该角色显示名
- 如果不传 `civilianWord` 和 `undercoverWord`，可通过 3.3 接口 AI 生成

**响应：**

```json
{
  "code": 0,
  "message": "游戏创建成功",
  "data": {
    "gameId": "uuid",
    "status": "waiting",
    "players": [ ... ],
    "civilianWord": "苹果",
    "undercoverWord": "梨子"
  }
}
```

---

### 3.2 获取游戏信息

```
GET /api/games/:gameId
Authorization: Bearer <token>
```

**响应：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "gameId": "uuid",
    "status": "waiting",
    "currentRound": 0,
    "players": [
      {
        "slotIndex": 0,
        "customName": "柯南",
        "type": "human",
        "isAlive": true
      }
    ],
    "createdAt": "2026-06-06T10:00:00Z"
  }
}
```

**注意：** 此接口不返回词语（仅玩家自己查看自己的词语），`role` 字段仅在游戏结束后可见。

---

### 3.3 AI 生成词语

```
POST /api/games/:gameId/words/generate
Authorization: Bearer <token>
```

**请求体（可选）：**

```json
{
  "theme": "水果",
  "difficulty": "适中"
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| theme | string | 否 | 主题词（如"食物"、"动物"），留空则不限主题 |
| difficulty | string | 否 | 难度：`"简单"` / `"适中"` / `"困难"`，控制 RAG 知识库检索时的难度标签过滤 |

**响应：**

```json
{
  "code": 0,
  "message": "词语生成成功",
  "data": {
    "civilianWord": "西瓜",
    "undercoverWord": "哈密瓜",
    "difficulty": "适中",
    "theme": "水果"
  }
}
```

**实现：** 调用 Dify `word-generator` 工作流（基于 RAG 知识库）。工作流内部流程：全文检索按难度/主题过滤词库 → 召回 10 对候选词 → LLM 随机选择 1 对 → 输出 JSON。词语来源于 Dify 知识库中预上传的 200+ 对真实标注词对，不会编造不存在的词语。

---

### 3.4 开始游戏

```
POST /api/games/:gameId/start
Authorization: Bearer <token>
```

**请求体：** 无（游戏配置已在创建时设定）

**响应：**

```json
{
  "code": 0,
  "message": "游戏开始",
  "data": {
    "gameId": "uuid",
    "status": "role_assign"
  }
}
```

**说明：**
- 此接口触发服务端角色分配（随机 1 卧底 + 5 平民）
- 分配完成后通过 WebSocket 推送 `role_assigned` 给玩家端
- 玩家端收到后展示自己的词语和身份

---

### 3.5 获取结算数据

```
GET /api/games/:gameId/result
Authorization: Bearer <token>
```

**响应：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "gameId": "uuid",
    "winner": "civilian",
    "civilianWord": "西瓜",
    "undercoverWord": "哈密瓜",
    "totalRounds": 4,
    "players": [
      {
        "slotIndex": 0,
        "customName": "柯南",
        "type": "human",
        "role": "civilian",
        "isAlive": true,
        "isMvp": true,
        "expGained": 50
      },
      {
        "slotIndex": 2,
        "customName": "AI老张",
        "type": "ai",
        "role": "undercover",
        "isAlive": false,
        "isMvp": false,
        "expGained": 0
      }
    ],
    "rounds": [
      {
        "round": 1,
        "speeches": [ ... ],
        "eliminated": 2,
        "voteDetails": { ... }
      }
    ]
  }
}
```

---

## 四、统计模块 `/api/stats`

### 4.1 排行榜

```
GET /api/stats/leaderboard?type=total&page=1&pageSize=20
```

| 参数 | 类型 | 说明 |
|------|------|------|
| type | string | `total`(总榜) / `weekly`(周榜) / `monthly`(月榜) |
| page | number | 页码，默认 1 |
| pageSize | number | 每页数量，默认 20，最大 100 |

**响应：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "page": 1,
    "pageSize": 20,
    "total": 150,
    "list": [
      {
        "rank": 1,
        "userId": "uuid",
        "nickname": "推理达人",
        "avatarUrl": "https://...",
        "level": 15,
        "totalGames": 120,
        "wins": 85,
        "winRate": 0.71,
        "mvpCount": 30,
        "score": 9850
      }
    ]
  }
}
```

**计分公式：**
```
score = wins * 100 + mvpCount * 50 + correctVotes * 20 + undercoverWins * 50 + survivalBonus * 30
```
- `wins`: 胜利场次（无论身份）
- `mvpCount`: MVP 次数
- `correctVotes`: 投票正确次数（投给了卧底）
- `undercoverWins`: 以卧底身份获胜场次（难度加成）
- `survivalBonus`: 存活到最后的场次

---

### 4.2 用户统计

```
GET /api/stats/user/:userId
```

**响应：** 同排行榜列表项结构 + 最近10场简要记录

---

### 4.3 用户对局历史

```
GET /api/users/:userId/history?page=1&pageSize=10
Authorization: Bearer <token>
```

**响应：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "page": 1,
    "pageSize": 10,
    "total": 28,
    "list": [
      {
        "gameId": "uuid",
        "role": "civilian",
        "winner": "civilian",
        "civilianWord": "西瓜",
        "undercoverWord": "哈密瓜",
        "totalRounds": 4,
        "isMvp": true,
        "expGained": 50,
        "finishedAt": "2026-06-05T15:30:00Z"
      }
    ]
  }
}
```

---

### 4.4 成就列表

```
GET /api/stats/achievements
```

**响应：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "achievements": [
      {
        "id": "first_blood",
        "name": "初出茅庐",
        "description": "完成第一局游戏",
        "icon": "trophy",
        "category": "battle",
        "rewardExp": 20
      }
    ]
  }
}
```

---

### 4.5 用户已解锁成就

```
GET /api/users/:userId/achievements
```

**响应：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "achievements": [
      {
        "id": "first_blood",
        "name": "初出茅庐",
        "icon": "trophy",
        "unlockedAt": "2026-06-05T15:30:00Z",
        "gameId": "uuid",
        "isNew": false
      }
    ]
  }
}
```

---

### 4.6 每日挑战

```
GET /api/stats/daily-challenge
Authorization: Bearer <token>
```

**响应：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "date": "2026-06-06",
    "challenges": [
      {
        "id": "dc_001",
        "name": "今日快枪手",
        "description": "在 3 轮内找出卧底",
        "rewardExp": 30,
        "completed": false
      },
      {
        "id": "dc_002",
        "name": "伪装达人",
        "description": "以卧底身份存活 4 轮以上",
        "rewardExp": 50,
        "completed": false
      }
    ]
  }
}
```

---

## 五、游戏回放 `/api/games/:id/replay`

```
GET /api/games/:id/replay
Authorization: Bearer <token>
```

**响应：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "gameId": "uuid",
    "winner": "civilian",
    "civilianWord": "西瓜",
    "undercoverWord": "哈密瓜",
    "totalRounds": 4,
    "events": [
      { "seq": 1, "type": "game_start", "timestamp": 1717678800000 },
      {
        "seq": 2, "type": "speech",
        "payload": {
          "slotIndex": 0, "customName": "柯南",
          "content": "这个东西红红的，吃起来很甜",
          "persona": null, "isAI": false
        },
        "timestamp": 1717678810000
      },
      {
        "seq": 3, "type": "speech",
        "payload": {
          "slotIndex": 2, "customName": "AI老张",
          "content": "根据已知信息分析，这个东西在生物学分类上属于蔷薇科...",
          "persona": "logic", "isAI": true
        },
        "aiInnerThought": "作为一个逻辑大师，我必须隐藏自己知道的'哈密瓜'这个词，用模糊的分类学描述来蒙混过关...",
        "timestamp": 1717678820000
      },
      {
        "seq": 4, "type": "vote_cast",
        "payload": { "voterSlot": 0, "voterName": "柯南", "targetSlot": 2, "targetName": "AI老张" },
        "timestamp": 1717678850000
      },
      {
        "seq": 5, "type": "elimination",
        "payload": { "slotIndex": 2, "customName": "AI老张", "role": "undercover" },
        "timestamp": 1717678860000
      },
      {
        "seq": 6, "type": "game_over",
        "payload": { "winner": "civilian" },
        "timestamp": 1717678860000
      }
    ]
  }
}
```

**特殊字段说明：**
- `aiInnerThought`：AI 心理旁白（由 Dify 后处理生成），仅在 AI 发言事件中出现
- 回放数据在游戏结束后异步生成，通常需要 3-5 秒

---

## 六、AI 人设工坊 `/api/personas`

### 6.1 创建自定义人设

```
POST /api/personas
Authorization: Bearer <token>
```

**请求体：**

```json
{
  "description": "一个总爱引用古诗词的老教授，说话文绉绉的，喜欢用之乎者也"
}
```

**限制：** 每人每月最多创建 3 个。

**响应：**

```json
{
  "code": 0,
  "message": "人设创建成功",
  "data": {
    "id": "uuid",
    "name": "古诗词教授",
    "description": "一个总爱引用古诗词的老教授...",
    "systemPrompt": "你是一位博学的老教授，说话文绉绉的，喜欢引用古诗词...",
    "authorId": "uuid",
    "usageCount": 0,
    "isPublic": false
  }
}
```

---

### 6.2 获取公共人设工坊

```
GET /api/personas?sort=popular&page=1&pageSize=20
```

**响应：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "page": 1,
    "pageSize": 20,
    "total": 45,
    "list": [
      {
        "id": "uuid",
        "name": "古诗词教授",
        "description": "一个总爱引用古诗词的老教授...",
        "authorName": "推理达人",
        "usageCount": 128,
        "likeCount": 42,
        "createdAt": "2026-06-01T00:00:00Z"
      }
    ]
  }
}
```

---

## 七、TTS 模块 `/api/tts`

### 7.1 语音合成

```
POST /api/tts/synthesize
Authorization: Bearer <token>
```

**请求体：**

```json
{
  "text": "轮到柯南发言了",
  "voice": "zh-CN-XiaoxiaoNeural",
  "speed": 1.0
}
```

**响应：** `audio/mpeg` 二进制流，或返回音频 URL：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "audioUrl": "https://cdn.example.com/tts/xxx.mp3",
    "duration": 3.5
  }
}
```

**说明：** 初期可复用 Web Speech API 客户端合成，TTS 接口为后续扩展预留。

---

## 八、Socket.IO 通信协议

### 8.1 连接

```js
// 客户端连接代码
import { io } from 'socket.io-client'

const socket = io('http://localhost:3456', {
  auth: {
    token: '<access_token>',
    gameId: '<gameId>',
    slotIndex: 0,  // 可选，人类玩家的座位号
  },
})
```

连接握手时通过 `auth` 参数传递 Token 进行认证，认证失败服务端断开连接并返回错误。

### 8.2 消息协议

socket.io 中事件名即为消息类型，无需 `{ type, payload, timestamp }` 信封包装。
每条消息的格式为服务端 `io.to(room).emit(eventName, payload)` / 客户端 `socket.emit(eventName, payload)`：

```json
// 服务端广播示例
io.to(gameId).emit('current_speaker', {
  "slotIndex": 2,
  "playerName": "AI老张"
})
```

### 8.3 客户端 → 服务端

<!-- 加入游戏通过 socket.io auth 参数传递，不再作为独立消息 -->

#### player_speech
玩家发言

```js
socket.emit('player_speech', {
  gameId: 'uuid',
  content: '这个东西红红的，吃起来很甜',
})
```

**校验：**
- 当前是否轮到该玩家发言
- 发言内容 2-100 字符
- 不能直接包含词语（简单关键词匹配）

#### cast_vote
投票

```js
socket.emit('cast_vote', {
  gameId: 'uuid',
  targetSlotIndex: 2,
})
```

**校验：**
- 当前处于投票阶段
- 目标玩家存活
- 不能投自己
- 不能重复投票

#### toggle_tts
切换语音朗读

```js
socket.emit('toggle_tts', {
  enabled: true,
})
```

---

### 8.4 服务端 → 客户端

#### game_state
全量游戏状态同步（连接时由 socket.io connection 事件自动发送）

```js
socket.on('game_state', (payload) => {
  // payload 结构:
  // { gameId, status, currentRound, maxRounds, players, yourSlotIndex, yourWord, yourRole, speeches }
})
```

**注意：** `word` 和 `role` 仅对当前客户端对应的玩家返回，其他玩家的这两个字段为 `null`。

---

#### game_started
游戏正式开始（角色分配完成后，由调度器广播）

```json
{
  "type": "game_started",
  "payload": {
    "gameId": "uuid",
    "currentRound": 1,
    "maxRounds": 5,
    "players": [
      { "slotIndex": 0, "customName": "柯南", "type": "human", "isAlive": true },
      { "slotIndex": 1, "customName": "逻辑哥", "type": "ai", "isAlive": true, "aiPersona": "logic" }
    ]
  }
}
```

---

#### phase_change
阶段切换（speaking ⇄ voting）

```json
{
  "type": "phase_change",
  "payload": {
    "phase": "voting",
    "round": 1
  }
}
```

---

#### current_speaker
当前发言人

```json
{
  "type": "current_speaker",
  "payload": {
    "slotIndex": 2,
    "playerName": "AI老张"
  }
}
```

---

#### request_speech
请求人类玩家发言（非 AI 玩家时发送）

```json
{
  "type": "request_speech",
  "payload": {
    "slotIndex": 0
  }
}
```

---

#### speech_timeout
发言超时（人类玩家未在限时内发言，自动跳过）

```json
{
  "type": "speech_timeout",
  "payload": {
    "slotIndex": 0,
    "playerName": "柯南"
  }
}
```

---

#### ai_speech_start / ai_speech_chunk / ai_speech_end
AI 发言（流式推送，支持打字机效果）

```json
// 开始发言
{ "type": "ai_speech_start", "payload": { "slotIndex": 2 } }

// 内容块（流式推送，每个 chunk 即时广播）
{ "type": "ai_speech_chunk", "payload": { "slotIndex": 2, "chunk": "这个东西在生物学分类上属于蔷薇科" } }

// 发言结束
{ "type": "ai_speech_end", "payload": { "slotIndex": 2, "playerName": "AI老张", "content": "完整发言内容..." } }
```

---

#### player_speech_broadcast
人类玩家发言广播

```json
{
  "type": "player_speech_broadcast",
  "payload": {
    "slotIndex": 0,
    "playerName": "柯南",
    "content": "这个东西红红的，吃起来很甜"
  }
}
```

---

#### current_voter
当前投票人

```json
{
  "type": "current_voter",
  "payload": {
    "slotIndex": 2,
    "playerName": "AI老张"
  }
}
```

---

#### request_vote
请求人类玩家投票（包含可选候选人列表）

```json
{
  "type": "request_vote",
  "payload": {
    "slotIndex": 0,
    "candidates": [
      { "slotIndex": 1, "playerName": "逻辑哥" },
      { "slotIndex": 2, "playerName": "AI老张" }
    ]
  }
}
```

---

#### vote_cast
投票结果（每投一票即时广播）

```json
{
  "type": "vote_cast",
  "payload": {
    "voterSlot": 2,
    "voterName": "AI老张",
    "targetSlot": 3,
    "targetName": "文艺范"
  }
}
```

---

#### vote_timeout
投票超时（人类玩家未在限时内投票，随机投给一名候选人）

```json
{
  "type": "vote_timeout",
  "payload": {
    "slotIndex": 0,
    "playerName": "柯南",
    "votedFor": 2
  }
}
```

---

#### player_eliminated
淘汰结果

```json
{
  "type": "player_eliminated",
  "payload": {
    "slotIndex": 2,
    "playerName": "AI老张",
    "wasUndercover": true
  }
}
```

---

#### elimination_tie
平票，无人淘汰

```json
{
  "type": "elimination_tie",
  "payload": {
    "message": "平票，无人淘汰"
  }
}
```

---

#### next_round
进入下一轮

```json
{
  "type": "next_round",
  "payload": {
    "round": 2
  }
}
```

---

#### game_over
游戏结束

```json
{
  "type": "game_over",
  "payload": {
    "winner": "civilian",
    "civilianWord": "西瓜",
    "undercoverWord": "哈密瓜",
    "undercoverSlotIndex": 2,
    "totalRounds": 4,
    "players": [
      { "slotIndex": 0, "customName": "柯南", "role": "civilian", "isAlive": true },
      { "slotIndex": 2, "customName": "AI老张", "role": "undercover", "isAlive": false }
    ]
  }
}
```

---

#### game_error
游戏运行异常

```json
{
  "type": "game_error",
  "payload": {
    "message": "游戏运行异常，请重新开始"
  }
}
```

---

#### achievement_unlocked
成就解锁通知

```json
{
  "type": "achievement_unlocked",
  "payload": {
    "id": "first_blood",
    "name": "初出茅庐",
    "icon": "trophy",
    "rewardExp": 20
  }
}
```

---

## 九、典型游戏流程时序

```
客户端A(玩家)         服务端               Dify              客户端B(AI-展示)
    │                  │                   │                    │
    │ POST /games      │                   │                    │
    │─────────────────►│                   │                    │
    │                  │  ──创建房间──      │                    │
    │◄─────────────────│                   │                    │
    │                  │                   │                    │
    │ POST /start      │                   │                    │
    │─────────────────►│                   │                    │
    │                  │ 分配角色+词语      │                    │
    │                  │ 启动 game loop    │                    │
    │                  │                   │                    │
    │ socket.io: connect (auth)            │                    │
    │◄════════════════►│                   │                    │
    │ socket.io: game_state (自动发送)     │                    │
    │◄─────────────────│                   │                    │
    │                  │                   │                    │
    │ socket.io: game_started              │                    │
    │◄─────────────────│                   │                    │
    │                  │                   │                    │
    │ socket.io: current_speaker           │                    │
    │◄─────────────────│ (轮到AI发言)      │                    │
    │                  │──────请求发言─────►│                    │
    │                  │◄─────流式返回────│                    │
    │ socket.io: ai_speech_*              │                    │
    │◄─────────────────│                   │                    │
    │                  │                   │                    │
    │ socket.io: current_speaker           │                    │
    │◄─────────────────│ (轮到玩家发言)    │                    │
    │                  │                   │                    │
    │ socket.io: player_speech             │                    │
    │─────────────────►│                   │                    │
    │ socket.io: player_speech_broadcast   │                    │
    │◄─────────────────│                   │                    │
    │                  │                   │                    │
    │ ... 6人依次发言 ...                  │                    │
    │                  │                   │                    │
    │ socket.io: phase_change (voting)     │                    │
    │◄─────────────────│                   │                    │
    │                  │                   │                    │
    │ socket.io: cast_vote                 │                    │
    │─────────────────►│                   │                    │
    │                  │ (AI调用Dify投票)  │                    │
    │ socket.io: vote_cast                 │                    │
    │◄─────────────────│                   │                    │
    │                  │                   │                    │
    │ socket.io: player_eliminated         │                    │
    │◄─────────────────│                   │                    │
    │                  │ 判断胜负          │                    │
    │                  │                   │                    │
    │ socket.io: game_over (或 next_round) │                    │
    │◄─────────────────│                   │                    │
```

---

## 十、接口测试要点

| 测试场景 | 验证内容 |
|----------|----------|
| 注册 - 正常 | 返回 user + token |
| 注册 - 重复用户名 | 409xx 错误 |
| 注册 - 弱密码 | 400xx 校验错误 |
| 登录 - 正确凭证 | 返回 token |
| 登录 - 错误密码 | 40101 |
| 创建游戏 - 正常 | 返回 gameId |
| 创建游戏 - 未登录 | 40100 |
| AI 生成词语 | 返回一对不同词语 |
| 开始游戏 | 状态变为 role_assign |
| socket.io - 无效 Token | 连接被拒，返回错误 |
| socket.io - 非发言阶段发言 | error 消息 |
| 排行榜分页 | 返回正确分页数据 |
| 成就列表 | 返回完整成就定义 |
| 用户成就 | 返回已解锁列表 |
| 创建人设 | 返回生成的 System Prompt |
| 创建人设 - 超限 | 403xx（每月上限 3 个） |
| 游戏回放 | 返回完整事件时间线 |

---

## 十一、版本记录

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.2 | 2026-06-09 | 迁移至 socket.io：通信协议从原生 WebSocket 改为 socket.io（连接握手 auth、自动重连、Room 管理）；移除 join_game/ping/pong 消息；base URL 端口改为 3456 |
| v1.1 | 2026-06-06 | 新增成就系统、游戏回放、AI 人设工坊、每日挑战接口；优化积分公式；支持多人联机预留 |
| v1.0 | 2026-06-06 | 初版，覆盖认证、游戏、统计、TTS、WS 全部接口 |
