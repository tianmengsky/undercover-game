import Database from 'better-sqlite3'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dbPath = join(__dirname, '..', '..', 'data.db')
const db = new Database(dbPath)

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map((r: any) => r.name)
console.log('表:', tables.join(', '))
console.log('')

for (const t of tables) {
  const count = db.prepare(`SELECT count(*) as c FROM [${t}]`).get() as any
  console.log(`--- ${t}: ${count.c} 行 ---`)
  if (count.c > 0) {
    const rows = db.prepare(`SELECT * FROM [${t}] LIMIT 3`).all()
    console.log(JSON.stringify(rows, null, 2))
  }
  console.log('')
}
db.close()
