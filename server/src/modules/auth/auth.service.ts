/**
 * auth.service.ts — 认证服务
 *
 * 职责: 注册 / 登录 / Token 刷新 / Token 校验
 * 存储: SQLite（Drizzle ORM）
 */
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'
import { eq } from 'drizzle-orm'
import { AppError, ErrorCodes } from '../../shared/errors.js'
import { getEnv } from '../../config/env.js'
import { db } from '../../db/index.js'
import { users } from '../../db/schema/users.js'
import type { RegisterInput, LoginInput } from './auth.schema.js'

const env = getEnv()

function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_SECRET as string, {
    expiresIn: env.ACCESS_TOKEN_EXPIRY,
  } as jwt.SignOptions)
}

function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_REFRESH_SECRET as string, {
    expiresIn: env.REFRESH_TOKEN_EXPIRY,
  } as jwt.SignOptions)
}

function verifyToken(token: string, secret: string): { sub: string } {
  try {
    return jwt.verify(token, secret) as { sub: string }
  } catch {
    throw new AppError(ErrorCodes.TOKEN_EXPIRED, 'Token 无效或已过期', 401)
  }
}

class AuthService {
  async register(input: RegisterInput) {
    const { username, password, nickname } = input

    // 检查用户名是否已存在
    const rows = await db.select().from(users).where(eq(users.username, username))
    if (rows[0]) {
      throw new AppError(ErrorCodes.USERNAME_TAKEN, '用户名已被注册', 409)
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const userId = crypto.randomUUID()
    const now = new Date()

    await (db.insert(users) as any).values({
      id: userId,
      username,
      nickname: nickname || username,
      passwordHash,
      level: 1,
      exp: 0,
      totalGames: 0,
      wins: 0,
      mvpCount: 0,
      undercoverWins: 0,
      survivalCount: 0,
      correctVotes: 0,
      usedWordsCount: 0,
      winStreak: 0,
      createdAt: now,
      updatedAt: now,
    })

    return {
      user: { id: userId, username, nickname: nickname || username, level: 1, exp: 0 },
      accessToken: signAccessToken(userId),
      refreshToken: signRefreshToken(userId),
    }
  }

  async login(input: LoginInput) {
    const { username, password } = input
    const userRows = await db.select().from(users).where(eq(users.username, username))
    const user = userRows[0]
    if (!user) {
      throw new AppError(ErrorCodes.WRONG_CREDENTIALS, '用户名或密码错误', 401)
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      throw new AppError(ErrorCodes.WRONG_CREDENTIALS, '用户名或密码错误', 401)
    }

    return {
      user: { id: user.id, username: user.username, nickname: user.nickname, level: user.level, exp: user.exp },
      accessToken: signAccessToken(user.id),
      refreshToken: signRefreshToken(user.id),
    }
  }

  async refresh(refreshToken: string) {
    const payload = verifyToken(refreshToken, env.JWT_REFRESH_SECRET)
    return {
      accessToken: signAccessToken(payload.sub),
      refreshToken: signRefreshToken(payload.sub),
    }
  }

  verifyAccessToken(token: string): { sub: string } {
    return verifyToken(token, env.JWT_SECRET)
  }
}

export const authService = new AuthService()
