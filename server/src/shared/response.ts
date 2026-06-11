export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T | null
}

export function success<T>(data: T, message = 'success'): ApiResponse<T> {
  return { code: 0, message, data }
}

export function error(code: number, message: string): ApiResponse<null> {
  return { code, message, data: null }
}
