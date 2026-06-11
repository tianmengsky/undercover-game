# 谁是卧底 - 多人 AI 推理社交游戏

> 基于 Vue 3 + Fastify + Socket.IO + Dify AI 的多人联机推理游戏

## 游戏简介

"谁是卧底"是一款经典的社交推理派对游戏。6 名玩家各自获得一个词语——其中 5 人拿到的词相近（平民），1 人拿到的词不同（卧底）。每轮玩家轮流用一句话描述自己的词语，然后投票淘汰最可疑的人。卧底被淘汰则平民获胜；卧底存活到最后则卧底获胜。

## 核心特性

- **多人实时联机** — Socket.IO 驱动的房间系统，创建/加入/踢人/房主转移
- **Dify AI 智能体** — AI 玩家可配置 8 种人设（幽默达人、逻辑大师、文艺青年...），风格各异
- **自定义人设工坊** — 玩家可创建自己的 AI 人设（system prompt + 个性描述）
- **流式发言** — AI 发言实时流式输出，配合 TTS 语音播报
- **投票系统** — 顺序投票 + 实时票型柱状图 + 淘汰翻牌动画
- **成就与等级** — 12 个成就 + 经验值/等级系统
- **游戏回放** — 逐事件回放完整对局（发言、投票、淘汰动画）
- **排行榜** — 总榜/周榜/月榜

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | Vue 3 + TypeScript + Pinia + Vue Router |
| 后端 | Fastify + Socket.IO + TypeScript |
| 数据库 | SQLite + Drizzle ORM |
| AI | Dify 工作流引擎（云端/本地均可） |
| TTS | Web Speech API |

## 快速开始

### 环境要求

- Node.js >= 20.19.0
- （可选）Dify 本地实例 或 Dify Cloud 账号

### 安装与运行

```bash
# 1. 安装服务端依赖
cd server
npm install

# 2. 安装客户端依赖
cd ../client
npm install

# 3. 配置环境变量（复制模板后填入你的密钥）
cd ../server
cp .env.example .env
# 编辑 .env，至少填入 JWT_SECRET 和 JWT_REFRESH_SECRET

# 4. 启动服务端（端口 3456）
cd ../server
npm run dev

# 5. 新开终端，启动客户端（端口 4173）
cd client
npm run dev
```

浏览器访问 http://localhost:4173 即可开始游戏。

### Dify AI（可选）

不配置 Dify 时游戏使用内置回退（固定词语 + 模板发言）。接入 Dify 后可获得：

- 每局随机生成不同词组
- AI 根据人设和上下文智能发言
- AI 分析发言记录进行投票

在 `.env` 中填入：
```
DIFY_BASE_URL=https://api.dify.ai/v1    # 或你的本地 Dify 地址
DIFY_API_KEY=app-xxxxxxxxxxxxx
```

## 项目结构

```
├── client/                  # Vue 3 前端
│   ├── src/
│   │   ├── components/       # 通用组件
│   │   │   ├── game/         # 游戏组件（PlayerList, SpeechArea, VotePanel...）
│   │   │   ├── room/         # 房间组件
│   │   │   └── common/       # 基础组件
│   │   ├── composables/      # 组合式函数（useWebSocket, useTTS, useTimer...）
│   │   ├── stores/           # Pinia 状态管理
│   │   ├── services/         # API 服务层
│   │   ├── views/            # 页面视图
│   │   └── types/            # TypeScript 类型定义
│   └── vite.config.ts
├── server/                   # Fastify 后端
│   └── src/
│       ├── modules/
│       │   ├── auth/         # 认证模块（注册/登录/JWT）
│       │   ├── game/         # 游戏模块（orchestrator/WebSocket/管理器）
│       │   ├── persona/      # AI 人设模块
│       │   └── stats/        # 统计/排行榜/成就
│       ├── db/               # 数据库（SQLite + Drizzle ORM）
│       ├── config/           # 环境配置
│       └── shared/           # 公共工具
└── .trae/docs/               # 项目文档
```

## 部署

详细零基础部署指南见 [09-零基础部署到Render指南.md](.trae/docs/09-零基础部署到Render指南.md)

## 游戏截图

> TODO: 添加游戏截图

## 许可

MIT
