import mysql from 'mysql2/promise'
import 'dotenv/config'

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'undercover',
  password: process.env.DB_PASSWORD || 'Undercover123!',
  database: process.env.DB_NAME || 'undercover_game',
})

const [tableRows] = await pool.execute(
  "SELECT TABLE_NAME as name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME",
  [process.env.DB_NAME || 'undercover_game'],
) as any

const tables = tableRows.map((r: any) => r.name)
console.log('表:', tables.join(', '))
console.log('')

for (const t of tables) {
  const [countRows] = await pool.execute(`SELECT count(*) as c FROM \`${t}\``) as any
  console.log(`--- ${t}: ${countRows[0].c} 行 ---`)
  if (countRows[0].c > 0) {
    const [dataRows] = await pool.execute(`SELECT * FROM \`${t}\` LIMIT 3`) as any
    console.log(JSON.stringify(dataRows, null, 2))
  }
  console.log('')
}

await pool.end()
