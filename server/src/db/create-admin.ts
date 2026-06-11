import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const db = new Database(join(__dirname, '..', '..', 'data.db'))

const rows = db.prepare('SELECT count(*) as c FROM users WHERE username = ?').get('admin') as any
if (rows.c > 0) {
  console.log('admin already exists, skipped')
  db.close()
  process.exit(0)
}

const hash = await bcrypt.hash('qwe123', 12)
const id = crypto.randomUUID()
const now = new Date().toISOString()

db.prepare(`INSERT INTO users (id,username,nickname,password_hash,avatar_url,level,exp,total_games,wins,mvp_count,undercover_wins,survival_count,correct_votes,used_words_count,win_streak,created_at,updated_at) VALUES (@id,@u,@n,@h,@a,@l,@e,@t,@w,@m,@uw,@s,@c,@uwc,@ws,@ct,@ut)`)
  .run({ id, u: 'admin', n: 'admin123', h: hash, a: '', l: 1, e: 0, t: 0, w: 0, m: 0, uw: 0, s: 0, c: 0, uwc: 0, ws: 0, ct: now, ut: now })

console.log('admin created, id=' + id)
db.close()
