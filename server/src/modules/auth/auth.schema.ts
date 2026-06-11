import { z } from 'zod'

export const registerSchema = {
  body: z.object({
    username: z.string().min(3).max(20).regex(/^\w+$/),
    password: z.string().min(6).max(30),
    nickname: z.string().min(2).max(12).optional(),
  }),
}

export const loginSchema = {
  body: z.object({
    username: z.string(),
    password: z.string(),
  }),
}

export const refreshSchema = {
  body: z.object({
    refreshToken: z.string(),
  }),
}

export type RegisterInput = z.infer<typeof registerSchema.body>
export type LoginInput = z.infer<typeof loginSchema.body>
