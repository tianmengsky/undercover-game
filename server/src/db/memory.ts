/**
 * memory.ts - 简易内存数据库（开发阶段使用，后续替换为 PostgreSQL）
 */
interface StoredUser {
  id: string
  username: string
  nickname: string
  passwordHash: string
  level: number
  exp: number
  totalGames: number
  wins: number
  mvpCount: number
  createdAt: string
}

const users: Map<string, StoredUser> = new Map()
const usersByUsername: Map<string, StoredUser> = new Map()

export const memoryDB = {
  findByUsername: (username: string): StoredUser | undefined => {
    return usersByUsername.get(username.toLowerCase())
  },
  createUser: (user: StoredUser): StoredUser => {
    users.set(user.id, user)
    usersByUsername.set(user.username.toLowerCase(), user)
    return user
  },
  findById: (id: string): StoredUser | undefined => {
    return users.get(id)
  },
}
