# 零基础部署指南：把"谁是卧底"部署到 Render 上线

**这份指南写给完全没有编程经验的用户。** 你不需要懂代码，只需要跟着每一步操作，最终就能让游戏在互联网上线，任何人都能访问。

> **重要提示**：本指南每一步只让你做一件事。请按顺序操作，不要跳步。

---

## 一、准备工作（5 分钟）

在开始之前，你需要准备好以下工具和账号。如果已经有了可以跳过。

### 1.1 安装 Git

Git 是用来把代码传到 GitHub 的工具。

1. 打开浏览器，访问 https://git-scm.com/download/win
2. 点击页面中间的下载按钮，下载安装包
3. 双击下载好的安装包，一路点"Next"（下一页），全部用默认选项
4. 最后点击"Install"（安装），等待完成

### 1.2 安装 Node.js

Node.js 是运行这个项目必需的环境。

1. 打开浏览器，访问 https://nodejs.org
2. 点击左侧绿色的"LTS"按钮（长期支持版，更稳定）
3. 下载完成后双击安装包
4. 一路点"Next"，全部用默认选项
5. 点击"Install"，等待安装完成

### 1.3 注册 GitHub 账号

GitHub 是存放代码的网站（免费的）。

1. 打开浏览器，访问 https://github.com
2. 点击右上角"Sign up"（注册）
3. 输入邮箱、密码、用户名，完成注册
4. 注册后登录你的 GitHub 账号

### 1.4 注册 Render 账号

Render 是部署网站的平台（有免费额度）。

1. 打开浏览器，访问 https://render.com
2. 点击"Get Started"（开始使用）
3. 选择"Sign up with GitHub"（用 GitHub 账号注册）
4. 授权 Render 访问你的 GitHub 账号
5. 完成注册后进入 Render 控制台页面（Dashboard）

### 1.5 确认项目能正常运行（可选但建议）

在部署前，先确保你的电脑上项目能跑起来。

1. 按键盘上的 `Win + R`，输入 `powershell`，回车
2. 输入以下内容后回车（复制粘贴，一行一行来）：
   ```
   cd e:\Code\UndercoverGame
   ```
3. 安装服务端依赖（需要几分钟）：
   ```
   cd server
   npm install
   ```
4. 安装客户端依赖：
   ```
   cd ..\client
   npm install
   ```
5. 如果以上都没有红色报错，说明环境没问题

---

## 二、本地项目整理（10 分钟）

在部署之前，我们需要对项目做一些调整，让它能在 Render 上正确运行。

### 2.1 修改服务端监听地址

Render 要求服务器监听 `0.0.0.0`（接受来自外部的连接），而不是 `127.0.0.1`（仅本机）。

1. 在 VS Code 中，打开文件 `server\src\index.ts`
2. 找到第 26 行附近的这一行代码：
   ```ts
   await app.listen({ port, host: '127.0.0.1' })
   ```
3. 把它改成：
   ```ts
   await app.listen({ port, host: '0.0.0.0' })
   ```
4. 按 `Ctrl + S` 保存

### 2.2 让服务端能提供前端页面

当前开发模式下，前端和后端是分开启动的（前端在 4173 端口，后端在 3456 端口）。部署到 Render 后，需要后端直接提供前端打包好的文件。

1. 在 VS Code 中，打开文件 `server\src\app.ts`
2. 在最顶部的 import 区域，找到 `import { getEnv } from './config/env.js'` 这一行，在它下面添加一行：
   ```ts
   import fastifyStatic from '@fastify/static'
   import { existsSync } from 'node:fs'
   ```
3. 在 `await app.register(fastifyRateLimit, ...)` 这一行的下面，添加以下代码：
   ```ts
   // 生产环境下提供前端静态文件
   const publicDir = new URL('../../client/dist', import.meta.url)
   if (existsSync(publicDir)) {
     await app.register(fastifyStatic, {
       root: fileURLToPath(publicDir),
       prefix: '/',
     })
     // SPA fallback：所有非 /api 路由返回 index.html
     app.setNotFoundHandler((_req, reply) => {
       reply.sendFile('index.html')
     })
   }
   ```
4. 在文件顶部 import 区域，还需要添加：
   ```ts
   import { fileURLToPath } from 'node:url'
   ```
   （如果这一行已经存在就不用重复添加了）
5. 按 `Ctrl + S` 保存

### 2.3 安装 @fastify/static 依赖

1. 在终端中输入：
   ```
   cd e:\Code\UndercoverGame\server
   npm install @fastify/static
   ```

### 2.4 修改客户端 WebSocket 连接地址

当前客户端连接 WebSocket 的地址是固定的 `http://....:3456`。部署后端口由 Render 分配，需要改成动态获取。

1. 在 VS Code 中，打开文件 `client\src\composables\useWebSocket.ts`
2. 找到第 36 行附近这一行：
   ```ts
   const WS_URL = `http://${window.location.hostname}:3456`
   ```
3. 把它改成：
   ```ts
   const WS_URL = `http://${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`
   ```
4. 按 `Ctrl + S` 保存

### 2.5 创建 .env.example 文件

Render 需要知道你的项目有哪些环境变量。我们在项目里创建一个模板文件。

1. 在 VS Code 中，在项目根目录 `e:\Code\UndercoverGame\server\` 下，新建文件 `.env.example`
2. 把以下内容粘贴进去：
   ```
   # 端口（Render 会自动设置 PORT，本地用 3456）
   PORT=3456

   # 运行环境
   NODE_ENV=production

   # 数据库文件路径（Render 持久化磁盘）
   DB_PATH=/data/undercover.db

   # JWT 密钥（必须换成你自己随机生成的！）
   JWT_SECRET=请在这里填一个16位以上的随机字符串
   JWT_REFRESH_SECRET=请在这里再填一个16位以上的随机字符串

   # Token 过期时间
   ACCESS_TOKEN_EXPIRY=15m
   REFRESH_TOKEN_EXPIRY=7d

   # CORS 允许的来源域名（多个用逗号隔开）
   CORS_ORIGIN=true

   # Dify AI 接口（可选，不填使用内置 AI）
   DIFY_BASE_URL=http://localhost/v1
   DIFY_API_KEY=

   # 以下两个是 placeholder，当前项目用 SQLite，不需要真实的 URL
   DATABASE_URL=placeholder
   REDIS_URL=placeholder
   ```
3. 按 `Ctrl + S` 保存

### 2.6 修改 .gitignore 确保 .env 不会上传

1. 在 VS Code 中，打开项目根目录下的 `.gitignore` 文件
2. 确保里面有 `*.env` 这一行（不是 `*.env.example`）
3. 如果没有，在末尾添加一行 `*.env`
4. 按 `Ctrl + S` 保存

### 2.7 新增 root package.json 脚本

Render 部署需要一个"启动命令"。我们在项目根部创建一个便捷脚本。

1. 在 VS Code 中，打开项目根目录的 `package.json`
2. 在 `"dependencies"` 后面添加（全文改成下面这样，只加了 scripts 和 engines）：
   ```json
   {
     "scripts": {
       "build": "cd client && npm install && npm run build-only && cd .. && cd server && npm install && npm run build",
       "start": "cd server && npm start"
     },
     "dependencies": {
       "ofetch": "^1.5.1"
     },
     "devDependencies": {
       "@vueuse/motion": "^3.0.3",
       "vite-plugin-pwa": "^1.3.0"
     },
     "engines": {
       "node": ">=20.19.0"
     }
   }
   ```
3. 按 `Ctrl + S` 保存

---

## 三、创建 GitHub 仓库并推送代码（10 分钟）

### 3.1 在 GitHub 上创建新仓库

1. 打开浏览器，登录 https://github.com
2. 点击右上角头像旁边的"+"号，选择"New repository"
3. 在"Repository name"输入框里填：`undercover-game`（或其他你想用的名字）
4. 选择"Public"（公开）或"Private"（私有），都可以
5. **不要勾选**"Add a README file"
6. 点击绿色"Create repository"按钮
7. 页面跳转后，你会看到一些命令行指令，先不要关掉这个页面

### 3.2 在本地初始化 Git 并推送

1. 打开终端（`Win + R` → `powershell`）
2. 进入项目目录：
   ```
   cd e:\Code\UndercoverGame
   ```
3. 初始化 Git 仓库：
   ```
   git init
   ```
4. 添加所有文件：
   ```
   git add .
   ```
5. 创建第一次提交：
   ```
   git commit -m "初始化项目"
   ```
6. 连接你的 GitHub 仓库（把 `你的用户名` 和 `你的仓库名` 换成你实际创建的）：
   ```
   git remote add origin https://github.com/你的用户名/你的仓库名.git
   ```
7. 推送到 GitHub：
   ```
   git branch -M main
   git push -u origin main
   ```
8. 如果弹出一个登录窗口，选择"Sign in with your browser"，用你的 GitHub 账号登录授权

---

## 四、在 Render 上部署（15 分钟）

### 4.1 创建 Web Service

1. 打开浏览器，登录 https://dashboard.render.com
2. 点击页面右上角的"New +"按钮
3. 选择"Web Service"
4. 在"Connect a repository"页面，找到你刚才创建的仓库（`undercover-game`）
5. 点击右侧的"Connect"按钮

### 4.2 配置部署参数

在出现的配置页面，按以下填写：

| 配置项 | 填写内容 |
|--------|---------|
| **Name** | `undercover-game`（或自定义） |
| **Region** | `Singapore (Southeast Asia)`（选最近的） |
| **Branch** | `main` |
| **Root Directory** | 留空 |
| **Runtime** | `Node` |
| **Build Command** | `npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | `Free` |

### 4.3 添加环境变量

在配置页面下方，找到"Environment Variables"区域。点击"Add Environment Variable"，逐个添加以下变量：

> **重要**：JWT_SECRET 和 JWT_REFRESH_SECRET 必须生成随机字符串！以下是一个生成方法

打开一个新标签页，访问 https://www.random.org/strings/ ，点 Generate 生成两段 20 位以上的随机字符串，复制下来。

| KEY（变量名） | VALUE（变量值） |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3456` |
| `DB_PATH` | `/data/undercover.db` |
| `JWT_SECRET` | （粘贴你刚才生成的随机字符串） |
| `JWT_REFRESH_SECRET` | （粘贴第二段随机字符串） |
| `ACCESS_TOKEN_EXPIRY` | `15m` |
| `REFRESH_TOKEN_EXPIRY` | `7d` |
| `CORS_ORIGIN` | `true` |
| `DATABASE_URL` | `placeholder` |
| `REDIS_URL` | `placeholder` |
| `DIFY_BASE_URL` | `http://localhost/v1` |

### 4.4 添加持久化磁盘（Disk）

SQLite 数据库文件需要存在一个不会丢失的地方。

1. 在配置页面左侧找到"Disks"栏
2. 点击"Add Disk"
3. 配置如下：

| 配置项 | 填写内容 |
|--------|---------|
| **Name** | `sqlite-data` |
| **Mount Path** | `/data` |
| **Size** | `1 GB` |

4. 点击"Save"

### 4.5 开始部署

1. 滚动到页面最底部
2. 点击"Create Web Service"按钮
3. Render 会自动开始构建和部署
4. 你会看到日志在滚动输出。**这个过程可能持续 5-10 分钟**，请耐心等待
5. 当看到 `Server running at http://0.0.0.0:3456` 这条日志时，说明部署成功

### 4.6 获取你的网址

1. 部署成功后，页面左上角会显示一个网址，类似 `https://undercover-game.onrender.com`
2. 点击这个网址，就可以访问你的游戏了
3. 把这个网址发给你朋友，他们也可以访问

---

## 五、常见问题排查

### Q1：推送代码到 GitHub 时报错 "Permission denied"

**原因**：Git 没有权限访问你的 GitHub 账号。

**解决方法**：
1. 打开 `开始菜单 → 设置 → 账户 → 访问工作或学校账户`（Windows 11）
2. 如果没有 GitHub 相关的凭证，回到终端
3. 运行：`git config --global user.name "你的GitHub用户名"`
4. 运行：`git config --global user.email "你的GitHub邮箱"`
5. 再试一次 `git push`，这次应该会弹出浏览器登录窗口

### Q2：推送代码到 GitHub 时报错 "failed to push some refs"

**原因**：远程仓库有文件而本地没有。

**解决方法**：
1. 在终端运行：`git pull origin main --allow-unrelated-histories`
2. 如果出现合并冲突提示，按 `Esc` 然后输入 `:wq` 回车
3. 再运行：`git push -u origin main`

### Q3：Render 构建时出错 "npm ERR!"

**原因**：依赖安装失败，通常是网络问题。

**解决方法**：
1. 在 Render Dashboard 找到你的服务
2. 点击右上角"Manual Deploy" → "Clear build cache & deploy"
3. 重新构建一次

### Q4：部署后访问网站显示 "Cannot GET /"

**原因**：前端打包文件没有正确提供。

**解决方法**：
1. 检查第 2.2 步是否正确添加了静态文件服务代码
2. 检查第 2.1 步是否把 `127.0.0.1` 改成了 `0.0.0.0`
3. 在 Render 的 Deploy Logs 中查看是否有报错

### Q5：网站打开后无法注册/登录

**原因**：`JWT_SECRET` 和 `JWT_REFRESH_SECRET` 没有正确设置。

**解决方法**：
1. 在 Render Dashboard 中找到你的服务
2. 点击"Environment"标签
3. 检查 `JWT_SECRET` 和 `JWT_REFRESH_SECRET` 是否都填了（两个值必须不同，各 16 位以上）
4. 如果改了变量，需要点"Manual Deploy" → "Deploy latest commit"重启

### Q6：注册时提示"服务器内部错误"，但本地运行正常

**原因**：`DB_PATH` 环境变量配置问题。

**解决方法**：
1. 在 Render Dashboard → Environment 中检查 `DB_PATH` 必须是 `/data/undercover.db`
2. 检查 Disk 是否正确挂载，路径是 `/data`
3. 检查服务器是否在 Render Dashboard 左侧显示了 Disk 信息

### Q7：点击开始游戏后一直卡住

**原因**：发送请求时前端 API 地址不正确。

**解决方法**：
1. 确认 `VITE_API_BASE_URL` 环境变量**没有**被添加（在 Render 环境中不需要这个变量，因为服务端直接提供前端页面，API 请求走同域名）

---

## 六、可选的 AI 增强：接入 Dify（让词语不重复、AI 人设更智能）

部署到 Render 时，AI 功能默认走**内置回退**：每局词语固定为"苹果 / 梨子"，AI 发言使用模板句子。这是为了保证游戏在任何情况下都能运行。

如果想要**每局词语随机生成 + AI 人设风格各异**（示范展示时效果更好），可以接入 Dify Cloud：

### 6.1 注册 Dify Cloud

1. 打开浏览器，访问 https://cloud.dify.ai
2. 点击"开始使用"，用 GitHub 或谷歌账号注册
3. 登录后进入 Dify 控制台

### 6.2 创建你的 AI 应用

1. 点击"创建应用" → 选择"聊天助手"
2. 应用名称填 `谁是卧底 AI`
3. 在左侧"工作流"栏中，设置以下三个分支（请参照本地 Dify 的工作流配置）：

| 分支 | 用途 |
|------|------|
| `词语生成` | 根据难度随机生成一对相近但不相同的词语（如"苹果 vs 梨子"） |
| `语义描述` | AI 根据自己拿到的词语，用对应人设风格描述它 |
| `投票` | AI 分析发言记录，选择最像卧底的玩家 |

4. 配置完成后，点击右上角"发布"

### 6.3 获取 API Key

1. 进入你创建的应用
2. 点击左侧"访问 API"
3. 复制页面上显示的 API Key（格式类似 `app-xxxxxxxxxxxxx`）

### 6.4 在 Render 上启用 Dify（评分当天操作）

1. 打开 https://dashboard.render.com，找到你的服务
2. 点击"Environment"标签
3. 修改以下两个环境变量：

| 变量名 | 值 |
|--------|-----|
| `DIFY_BASE_URL` | `https://api.dify.ai/v1` |
| `DIFY_API_KEY` | `app-xxxxxxxxxxxxx`（你刚才复制的 Key） |

4. 点击"Save Changes"
5. 点击右上角"Manual Deploy" → "Deploy latest commit"

> **重要**：免费版 Dify Cloud 每月 200 次调用。一局 6 人游戏约消耗 20-40 次调用。**评分演示结束后，建议把 `DIFY_API_KEY` 清空**（恢复为内置回退），避免后续测试耗尽额度。

---

## 七、更新代码（后续维护）

当你修改了代码，想更新线上版本：

1. 像往常一样在 VS Code 中修改代码
2. 打开终端，运行以下命令：
   ```
   cd e:\Code\UndercoverGame
   git add .
   git commit -m "描述你改了什么"
   git push
   ```
3. Render 会自动检测到推送并重新部署（通常在 1-2 分钟内开始）

---

## 八、免费额度说明

| 项目 | 免费额度 | 限制 |
|------|---------|------|
| Render Web Service | 750 小时/月 | 15 分钟无访问会休眠（再次访问需等 30-60 秒唤醒） |
| Render Disk | $0.07/GB·月 | 1GB 足够 SQLite 使用 |
| GitHub | 无限 | 公开仓库免费 |

> **关于休眠**：免费服务 15 分钟没人访问就会自动休眠。下一个访问者需要等 30-60 秒。如果想避免休眠，可以升级到付费版（$7/月），或者使用 UptimeRobot 等免费监控服务定期访问你的网站。**建议先免费使用，确认稳定后再考虑升级。**

---

## 九、安全提醒

1. **绝对不要**把 `.env` 文件上传到 GitHub（`.gitignore` 已经帮你忽略了）
2. **绝对不要**在 Render 环境变量中使用本指南里的示例密码
3. `JWT_SECRET` 和 `JWT_REFRESH_SECRET` 一旦设定就不要轻易更改（改了会导致所有用户强制退出）
4. 定期备份你的 `data.db` 文件（Render Disk 目前不支持直接下载，代码中可添加定期下载功能——建议上线后咨询开发者帮你加上自动备份）

---

**恭喜你！如果你按以上步骤一路走下来，你的"谁是卧底"游戏已经成功上线了！🎉**
