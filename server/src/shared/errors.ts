export class AppError extends Error {
  constructor(
    public code: number,
    message: string,
    public statusCode: number = 400,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const ErrorCodes = {
  INVALID_PARAMS: 40001,
  UNAUTHORIZED: 40100,
  WRONG_CREDENTIALS: 40101,
  TOKEN_EXPIRED: 40102,
  FORBIDDEN: 40300,
  NOT_FOUND: 40400,
  GAME_NOT_FOUND: 40401,
  CONFLICT: 40900,
  USERNAME_TAKEN: 40901,
  NOT_YOUR_TURN: 40902,
  ALREADY_VOTED: 40903,
  GAME_ALREADY_STARTED: 40904,
  ROOM_FULL: 40905,
  INTERNAL: 50000,
} as const
