/**
 * formatters.ts - 时间/数字格式化工具（零依赖）
 */

/**
 * 友好的时间显示
 *   < 1 分钟 → "刚刚"
 *   < 60 分钟 → "X 分钟前"
 *   < 24 小时 → "X 小时前"
 *   本周内    → "X 天前"
 *   今年内    → "MM-DD"
 *   跨年      → "YYYY-MM-DD"
 */
export function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const minutes = Math.floor((now - then) / 60000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`

  const days = Math.floor(hours / 24)
  if (days <= 7) return `${days} 天前`

  const thenDate = new Date(dateStr)
  const year = thenDate.getFullYear()
  const month = String(thenDate.getMonth() + 1).padStart(2, '0')
  const day = String(thenDate.getDate()).padStart(2, '0')

  if (year === new Date().getFullYear()) return `${month}-${day}`

  return `${year}-${month}-${day}`
}

/**
 * 格式化日期为 YYYY-MM-DD HH:mm
 */
export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * 胜率（百分比，保留一位小数）
 */
export function winRate(wins: number, total: number): string {
  if (total === 0) return '0%'
  return ((wins / total) * 100).toFixed(1) + '%'
}

/**
 * 数字缩略（1000 → 1.0k, 10000 → 1.0w）
 */
export function compactNum(n: number): string {
  if (n < 1000) return String(n)
  if (n < 10000) return (n / 1000).toFixed(1) + 'k'
  return (n / 10000).toFixed(1) + 'w'
}
