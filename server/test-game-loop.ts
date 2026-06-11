/**
 * test-game-loop.ts - 测试完整游戏流程（纯 AI 对战）
 * 用法: npx tsx test-game-loop.ts
 */
const BASE = 'http://localhost:3000'

async function request(method: string, path: string, body?: object, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  return res.json()
}

async function main() {
  // 1. 注册/登录
  console.log('1. 注册/登录...')
  let loginRes = await request('POST', '/api/auth/login', { username: 'testbot', password: '123456' })
  if (loginRes.code !== 0) {
    const regRes = await request('POST', '/api/auth/register', { username: 'testbot', password: '123456' })
    if (regRes.code !== 0) throw new Error('注册失败: ' + JSON.stringify(regRes))
    loginRes = await request('POST', '/api/auth/login', { username: 'testbot', password: '123456' })
  }
  const token = loginRes.data.accessToken
  console.log('   Token:', token.slice(0, 20) + '...')

  // 2. 创建游戏（全 AI 对战，方便自动化测试）
  console.log('\n2. 创建游戏...')
  const aiPlayers = [
    { slotIndex: 0, type: 'ai', persona: 'default', customName: '路人甲' },
    { slotIndex: 1, type: 'ai', persona: 'logic', customName: '逻辑哥' },
    { slotIndex: 2, type: 'ai', persona: 'humor', customName: '幽默侠' },
    { slotIndex: 3, type: 'ai', persona: 'literary', customName: '文艺范' },
    { slotIndex: 4, type: 'ai', persona: 'newbie', customName: '小萌新' },
    { slotIndex: 5, type: 'ai', persona: 'grumpy', customName: '暴躁帝' },
  ]
  const createRes = await request('POST', '/api/games', { players: aiPlayers }, token)
  if (createRes.code !== 0) throw new Error('创建失败: ' + JSON.stringify(createRes))
  const gameId = createRes.data.gameId
  console.log('   GameId:', gameId)

  // 3. 生成词语
  console.log('\n3. 生成词语...')
  const wordsRes = await request('POST', `/api/games/${gameId}/words/generate`, { difficulty: '简单' }, token)
  console.log('   结果:', JSON.stringify(wordsRes.data))

  // 用 generate 的结果创建带词语的房间
  console.log('\n4. 用生成的词语重新创建房间...')
  const { commonWord, undercoverWord } = wordsRes.data
  const createRes2 = await request('POST', '/api/games', {
    civilianWord: commonWord,
    undercoverWord: undercoverWord,
    players: aiPlayers,
  }, token)
  const gameId2 = createRes2.data.gameId
  console.log('   GameId:', gameId2)

  // 5. 启动游戏
  console.log('\n5. 启动游戏...')
  const startRes = await request('POST', `/api/games/${gameId2}/start`, {}, token)
  console.log('   结果:', JSON.stringify(startRes.data))

  // 6. 等游戏运行（全 AI 对战，Dify 调用约需 60-120 秒）
  console.log('\n6. 等待游戏运行...')
  for (let i = 0; i < 12; i++) {
    await new Promise(r => setTimeout(r, 10_000))
    const room = await request('GET', `/api/games/${gameId2}`, null, token)
    console.log(`   [${(i+1)*10}s] 状态: ${room.data?.status}, 轮次: ${room.data?.currentRound}`)
    if (room.data?.status === 'finished') break
  }

  // 7. 查看结算
  console.log('\n7. 查看结算...')
  const resultRes = await request('GET', `/api/games/${gameId2}/result`, null, token)
  console.log('   结果:', JSON.stringify(resultRes.data, null, 2))

  console.log('\n=== 测试完成 ===')
}

main().catch(err => {
  console.error('测试失败:', err)
  process.exit(1)
})
