# 谁是卧底 - 多人 AI 推理社交游戏

> 基于 Vue 3 + Fastify + Socket.IO + Dify AI 的多人联机推理游戏

## 游戏简介

"谁是卧底"是一款经典的社交推理派对游戏。6 名玩家各自获得一个词语——其中 5 人拿到的词相近（平民），1 人拿到的词不同（卧底）。每轮玩家轮流用一句话描述自己的词语，然后投票淘汰最可疑的人。卧底被淘汰则平民获胜；卧底存活到最后则卧底获胜。

## 核心特性

- **多人实时联机** — Socket.IO 房间系统，创建 / 加入 / 踢人 / 房主转移 / 断线重连 / AI接管
- **Dify AI 智能体** — 8 种官方人设（名侦探柯南、路飞、鸣人、熊大熊二、喜羊羊灰太狼...），风格各异
- **AI 人设工坊** — 创建自定义 AI 人设，关键词自动匹配生成 system prompt + 声音参数
- **流式发言 + TTS** — AI 发言实时流式输出（打字机动画），Web Speech API 语音播报
- **投票系统** — 顺序投票 + 实时票型柱状图 + 淘汰翻牌动画 + 身份揭示
- **成就与等级** — 12 个成就 + 经验值 / 等级系统（exp 自动推等级）
- **游戏回放** — 逐事件回放完整对局，速度可调
- **排行榜** — 总榜 / 周榜 / 月榜，多维计分
- **安全认证** — bcrypt 密码哈希 + JWT 双密钥分层（access / refresh token）

## 技术栈

### 前端

| 分类 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 框架 | Vue 3（组合式 API） | ^3.5 | `<script setup>` + 响应式 |
| 语言 | TypeScript | ~6.0 | 全项目类型安全 |
| 状态管理 | Pinia | ^3.0 | setup store 模式 |
| 路由 | Vue Router | ^5.0 | SPA 页面路由 |
| 构建工具 | Vite | ^8.0 | 开发服务器 + 生产打包 + API 代理 |
| HTTP 请求 | ofetch | ^1.5 | 请求/响应拦截器，自动注入 JWT |
| WebSocket 客户端 | socket.io-client | ^4.8 | 实时通信（游戏状态同步） |
| CSS 方案 | Scoped CSS + CSS Variables | 原生 | 组件级样式隔离 + 主题变量 |
| 动画 | CSS @keyframes + requestAnimationFrame | 原生 | 淘汰翻牌、发言气泡、数字跳动、票型柱状图 |
| TTS | Web Speech API | 浏览器原生 | AI 发言语音播报 |
| 单元测试 | Vitest | ^4.1 | 组件 / 逻辑单元测试 |
| E2E 测试 | Playwright | ^1.59 | 端到端测试 |
| 代码检查 | ESLint + oxlint | 10.x / 1.60 | 双 linter 并行 |
| 格式化 | Prettier | 3.8 | 代码格式化 |

### 后端

| 分类 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 运行时 | Node.js | ≥20.19 | — |
| 语言 | TypeScript | ^5.8 | 全项目类型安全 |
| Web 框架 | Fastify | ^5.3 | HTTP 路由 + 中间件 |
| 开发运行 | tsx | ^4.19 | 直接运行 .ts 文件（无需编译） |
| 配置校验 | Zod | ^3.24 | 环境变量校验 + 请求体校验 |
| 日志 | pino + pino-pretty | ^9.7 | 结构化日志（dev 模式彩色输出） |

### 数据库（MySQL + Drizzle ORM）

| 分类 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 数据库 | MySQL | 8.0 | 关系型数据库 |
| SQL 驱动 | mysql2 | ^3.22 | Node.js MySQL 连接池驱动 |
| ORM | Drizzle ORM | ^0.42 | 类型安全的 SQL 查询构造 |
| ORM 工具 | drizzle-kit + drizzle-zod | latest | Schema 迁移 + Zod 类型生成 |

11 张表：`users` / `game_records` / `game_players` / `game_rounds` / `game_speeches` / `word_cache` / `achievements` / `user_achievements` / `personas` / `persona_likes` / `persona_monthly_limits`

### 认证安全

| 分类 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 密码哈希 | bcryptjs | ^2.4.3 | 注册时 12 轮盐值哈希（自动随机盐值） |
| Token 签发/验证 | jsonwebtoken | ^9.0.2 | HS256 签名 JWT |
| Token 分层 | accessToken (15min) + refreshToken (7d) | 自实现 | 双密钥隔离攻击面 |
| 请求守卫 | authGuard | Fastify preHandler | 每个 API 请求自动校验 JWT |

### 中间件 / 插件

| 分类 | 技术 | 用途 |
|------|------|------|
| CORS | @fastify/cors | 跨域请求允许 |
| 安全头 | @fastify/helmet | HTTP 安全响应头 |
| 限流 | @fastify/rate-limit | 100 次/分钟防滥用 |
| 静态文件 | @fastify/static | 生产模式提供前端 dist |
| 环境变量 | dotenv | 读取 .env 文件 |

### AI（Dify 工作流引擎）

| 分类 | 技术 | 用途 |
|------|------|------|
| 工作流引擎 | Dify（本地 Docker） | 词语生成、AI 发言（流式）、AI 投票 |
| 调用方式 | `fetch()`（Node 原生） | POST to Dify API `/chat-messages` |
| 流式解析 | AsyncGenerator | 逐 token yield 到 WebSocket 广播 |
| 回退机制 | 模板发言池 + 固定词对 | Dify 不可用时不中断游戏 |

## Dify AI 工作流

项目使用**单一 Dify 应用 + 三路分支**的轻量架构：

| 分支 | 用途 | 输出 |
|------|------|------|
| 词语生成 | 知识检索 + LLM 随机生成相近词对 | `{common_word, undercover_word}` |
| 语义描述 | LLM 根据人设 + 上下文 + 词语流式发言 | 逐 token 流式输出 |
| 投票 | LLM 分析全盘发言记录投票 | 目标玩家昵称 |

不配置 Dify 时游戏自动走内置回退（模板发言 + 固定词对），功能不受影响。

## 快速开始

### 环境要求

- Node.js >= 20.19.0
- Docker Desktop（运行 Dify）
- Dify 本地实例 + 已配置的「谁是卧底 AI」工作流

### 安装与运行

```bash
# 1. 克隆项目
git clone https://github.com/tianmengsky/undercover-game.git
cd undercover-game

# 2. 安装服务端依赖
cd server
npm install

# 3. 安装客户端依赖
cd ../client
npm install

# 4. 配置环境变量
cd ../server
cp .env.example .env
# 编辑 .env，填入 JWT_SECRET、JWT_REFRESH_SECRET、DIFY_API_KEY

# 5. 启动 Dify（Docker Desktop 需已启动）
# Dify 默认运行在 http://localhost

# 6. 启动服务端（端口 3456）
cd server
npm run dev

# 7. 新开终端，启动客户端（端口 4173）
cd client
npm run dev
```

浏览器访问 http://localhost:4173 即可开始游戏。建议打开两个窗口（一个隐私窗口）模拟多人联机。

### 环境变量说明

| 变量 | 必填 | 说明 |
|------|------|------|
| `JWT_SECRET` | 是 | accessToken 签名密钥（≥16 字符随机字符串） |
| `JWT_REFRESH_SECRET` | 是 | refreshToken 签名密钥（与 JWT_SECRET 不同） |
| `DIFY_API_KEY` | 否 | Dify 应用 API Key，不填则用内置回退 |
| `DIFY_BASE_URL` | 否 | Dify 地址，默认 `http://localhost/v1` |
| `CORS_ORIGIN` | 否 | 允许的来源，默认 `http://localhost:4173` |

## 项目结构

```
├── client/                     # Vue 3 前端
│   └── src/
│       ├── components/
│       │   ├── game/           # 游戏组件（PlayerList, SpeechArea, VotePanel, WordReveal...）
│       │   ├── room/           # 房间组件
│       │   ├── profile/        # 个人信息组件（LevelProgress, GameHistory）
│       │   ├── common/         # 基础组件（AppHeader, AppCountdown, AppModal...）
│       │   └── auth/           # 认证组件
│       ├── composables/        # 组合式函数（useWebSocket, useTTS, useTimer, useGame...）
│       ├── stores/             # Pinia 状态管理（auth, game, chat, achievements, settings）
│       ├── services/           # API 服务层（auth, game, room, persona, stats, tts）
│       ├── views/              # 页面视图（Home, Room, Game, Result, Replay, Profile, Leaderboard...）
│       ├── types/              # TypeScript 类型定义
│       └── router/             # Vue Router 路由配置
├── server/                     # Fastify 后端
│   └── src/
│       ├── modules/
│       │   ├── auth/           # 认证模块（bcrypt + JWT 双密钥）
│       │   ├── game/           # 游戏核心（orchestrator / WebSocket / 回放 / 房间管理）
│       │   ├── persona/        # AI 人设工坊（关键词匹配 + system prompt 生成）
│       │   └── stats/          # 排行榜 / 成就 / 经验值
│       ├── db/                 # SQLite + Drizzle ORM（连接 / schema / seed）
│       ├── config/             # 环境配置（Zod 校验）
│       └── shared/             # 公共工具（错误码 / 响应封装）
└── dify-workflow/              # Dify 工作流导出文件（.yml）
```

## 演示指南

详细本地演示流程（含 9 步操作 + Dify 展示 + 应急预案）见 `.trae/docs/10-本地演示流程.md`

## 认证安全

| 层 | 技术 | 说明 |
|---|------|------|
| 密码存储 | bcrypt（12 轮盐值哈希） | 密码不可逆，数据库泄露也无法还原 |
| 会话凭证 | JWT（HS256）双密钥 | accessToken 15 分钟 + refreshToken 7 天，分层隔离 |
| 请求拦截 | authGuard 中间件 | 每个 API 请求自动校验 JWT 签名 |

## 许可

MIT
