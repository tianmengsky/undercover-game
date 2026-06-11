import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().default(3456),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url().optional().default('placeholder'),
  REDIS_URL: z.string().url().optional().default('placeholder'),
  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  ACCESS_TOKEN_EXPIRY: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRY: z.string().default('7d'),
  DIFY_BASE_URL: z.string().url().default('http://localhost/v1'),
  DIFY_API_KEY: z.string().optional(),
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:5173')
    .transform((val) => {
      // 支持逗号分隔的多域名，或 true 表示允许全部（开发环境）
      if (val === 'true') return true
      return val.includes(',') ? val.split(',').map((s) => s.trim()) : val
    }),
})

export type Env = z.infer<typeof envSchema>

let _env: Env | null = null

export function loadEnv(): Env {
  if (_env) return _env
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    console.error('Invalid environment variables:', result.error.format())
    process.exit(1)
  }
  _env = result.data
  return _env
}

export function getEnv(): Env {
  if (!_env) return loadEnv()
  return _env
}
