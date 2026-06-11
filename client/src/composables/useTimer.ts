/**
 * useTimer.ts - 倒计时 composable（平滑版）
 *
 * remaining:  整数秒数，用于 UI 文字显示
 * progress:   0-1 亚帧级连续值（requestAnimationFrame 驱动），进度条平滑
 */
import { ref, computed, onUnmounted } from 'vue'

export function useTimer() {
  const remaining = ref(0)
  const totalSec = ref(0)
  const progress = ref(0)
  let _timer: ReturnType<typeof setInterval> | null = null
  let _raf = 0
  let _deadline = 0

  const isUrgent = computed(() => remaining.value > 0 && remaining.value <= 5)
  const isExpired = computed(() => remaining.value <= 0 && totalSec.value > 0)

  function start(deadline: number) {
    _deadline = deadline
    const totalMs = Math.max(0, deadline - Date.now())
    totalSec.value = Math.ceil(totalMs / 1000)
    remaining.value = totalSec.value
    progress.value = totalSec.value > 0 ? 1 : 0

    stop()
    if (totalSec.value <= 0) return

    // 整数秒更新 → UI 文字
    _timer = setInterval(() => {
      remaining.value = Math.max(0, Math.ceil((_deadline - Date.now()) / 1000))
      if (remaining.value <= 0) stop()
    }, 200)

    // requestAnimationFrame → 进度条平滑连续
    const tick = () => {
      if (!_deadline) return
      const left = Math.max(0, _deadline - Date.now())
      progress.value = totalSec.value > 0 ? left / (totalSec.value * 1000) : 0
      if (left > 0) _raf = requestAnimationFrame(tick)
    }
    _raf = requestAnimationFrame(tick)
  }

  function stop() {
    if (_timer) { clearInterval(_timer); _timer = null }
    if (_raf) { cancelAnimationFrame(_raf); _raf = 0 }
  }

  function reset() {
    stop()
    remaining.value = 0
    totalSec.value = 0
    progress.value = 0
  }

  onUnmounted(() => stop())

  return { remaining, isUrgent, isExpired, progress, start, stop, reset }
}
