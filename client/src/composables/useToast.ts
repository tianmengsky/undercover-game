/**
 * useToast.ts - 全局消息提示 composable
 *
 * 用法：
 *   const toast = useToast()
 *   toast.success('操作成功')
 *   toast.error('操作失败')
 */
import { ref } from 'vue'

export interface ToastItem {
  id: number
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
}

let _id = 0
const toasts = ref<ToastItem[]>([])

export function useToast() {
  function add(type: ToastItem['type'], message: string, duration = 3000) {
    const id = ++_id
    toasts.value.push({ id, type, message })
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id)
    }, duration)
  }

  return {
    toasts,
    success: (msg: string, dur?: number) => add('success', msg, dur),
    error: (msg: string, dur?: number) => add('error', msg, dur),
    warning: (msg: string, dur?: number) => add('warning', msg, dur),
    info: (msg: string, dur?: number) => add('info', msg, dur),
  }
}
