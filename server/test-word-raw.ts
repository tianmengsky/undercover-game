/**
 * test-word-raw.ts — 直接调 Dify 打印原始响应，绕过 env 校验
 */
import { config } from 'dotenv'
config({ path: '.env' })

const API_KEY = process.env.DIFY_API_KEY || ''
const BASE = process.env.DIFY_BASE_URL || ''

if (!API_KEY) { console.error('Missing DIFY_API_KEY'); process.exit(1) }
if (!BASE) { console.error('Missing DIFY_BASE_URL'); process.exit(1) }

const DIFY_URL = `${BASE}/chat-messages`

async function main() {
  console.log(`URL: ${DIFY_URL}`)
  console.log(`KEY: ${API_KEY.slice(0, 10)}...\n`)

  const body = {
    inputs: { type: '词语生成' },
    query: '难度：适中',
    response_mode: 'blocking',
    conversation_id: '',
    user: 'abc-123',
  }

  const res = await fetch(DIFY_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    console.error(`HTTP ${res.status}: ${await res.text().catch(() => '')}`)
    return
  }

  const raw: any = await res.json()
  console.log(`answer (${(raw.answer || '').length} chars):`)
  console.log(raw.answer)
  console.log(`\nmetadata:`)
  console.log(JSON.stringify(raw.metadata, null, 2))
}

main().catch(e => { console.error(e); process.exit(1) })
