/** 每局游戏固定 6 个角色位 */
export const GAME_SLOTS = 6

/** 最大游戏轮数 */
export const MAX_ROUNDS = 5

/** 发言阶段限时（秒） */
export const SPEECH_TIMEOUT_SEC = 30

/** 投票阶段限时（秒） */
export const VOTE_TIMEOUT_SEC = 30

/** 游戏结束后房间保留时间（秒） */
export const ROOM_RETENTION_SEC = 5 * 60

/** WebSocket 心跳间隔（秒） */
export const WS_PING_INTERVAL_SEC = 30

/** WebSocket 超时断开（秒） */
export const WS_TIMEOUT_SEC = 60

/** AI 发言超时（毫秒） */
export const AI_SPEECH_TIMEOUT_MS = 15_000

/** 卧底模式 */
export const UNDERCOVER_MODE = ['single', 'double'] as const
export type UndercoverMode = (typeof UNDERCOVER_MODE)[number]
