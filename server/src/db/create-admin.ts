import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import 'dotenv/config'

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'undercover',
  password: process.env.DB_PASSWORD || 'Undercover123!',
  database: process.env.DB_NAME || 'undercover_game',
})

const [rows] = await pool.execute('SELECT count(*) as c FROM users WHERE username = ?', ['admin']) as any
if (rows[0].c > 0) {
  console.log('admin already exists, skipped')
  await pool.end()
  process.exit(0)
}

const hash = await bcrypt.hash('qwe123', 12)
const id = crypto.randomUUID()
const now = new Date().toISOString()

await pool.execute(
  `INSERT INTO users (id, username, nickname, password_hash, avatar_url, level, exp, total_games, wins, mvp_count, undercover_wins, survival_count, correct_votes, used_words_count, win_streak, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [id, 'admin', 'admin123', hash, '', 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, now, now],
)

console.log('admin created, id=' + id)
await pool.end()
