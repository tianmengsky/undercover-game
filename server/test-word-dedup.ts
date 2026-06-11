/**
 * test-word-dedup.ts — 适中难度 × 随机类型 × 50次，统计重复率
 *
 * 用法: npx tsx test-word-dedup.ts
 * （需要传入 Dify 环境变量，见 .env）
 */
import 'dotenv/config'
import { generateWordPair } from './src/modules/game/game.ai.js'

async function main() {
  const results = new Map<string, number>()

  console.log('适中难度 × 随机类型 × 50 次\n')

  for (let i = 0; i < 50; i++) {
    try {
      const p = await generateWordPair('适中')
      const k = `${p.commonWord}|${p.undercoverWord}`
      results.set(k, (results.get(k) || 0) + 1)
      const dup = results.get(k)! > 1 ? ` ⚠×${results.get(k)}` : ''
      process.stdout.write(`[${i + 1}] ${p.commonWord} / ${p.undercoverWord}${dup}\n`)
    } catch (e: any) {
      process.stdout.write(`[${i + 1}] ERROR: ${e.message}\n`)
    }
  }

  const total = [...results.values()].reduce((a, b) => a + b, 0)
  const dups = [...results.entries()].filter(([, v]) => v > 1)
  const dupRate = total > 0 ? ((1 - results.size / total) * 100).toFixed(1) : '0'

  console.log(`\n=== 统计 ===`)
  console.log(`总调用: ${total}`)
  console.log(`唯一词对: ${results.size}`)
  console.log(`重复对: ${dups.length}`)
  console.log(`重复率: ${dupRate}%`)

  if (dups.length > 0) {
    console.log(`\n重复详情:`)
    for (const [k, v] of [...results.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
      if (v > 1) console.log(`  ×${v}  ${k}`)
    }
  }
}

main().catch(e => { console.error(e); process.exit(1) })
