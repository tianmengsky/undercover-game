/**
 * useTTS.ts - 语音朗读
 *
 * 基于浏览器原生 SpeechSynthesis API
 * 支持: 排队播报、停止、音色/语速/音量控制
 */
import { ref } from 'vue'

export interface VoiceOptions {
  voiceName?: string
  pitch?: number   // 0.5~2.0（DB 存 *100 的整数）
  rate?: number
  volume?: number
}

export function useTTS() {
  const enabled = ref(false)
  const isSpeaking = ref(false)
  const queue: Array<{ text: string; options?: VoiceOptions }> = []

  /** 获取系统可用语音包 */
  function getVoices(): SpeechSynthesisVoice[] {
    return window.speechSynthesis.getVoices()
  }

  /** 获取中文语音包列表（降级：任意可用） */
  function getChineseVoices(): SpeechSynthesisVoice[] {
    const all = getVoices()
    const zh = all.filter((v) => v.lang.startsWith('zh'))
    return zh.length > 0 ? zh : all
  }

  /** 播放下一个 */
  function playNext() {
    if (queue.length === 0) {
      isSpeaking.value = false
      return
    }

    const syn = window.speechSynthesis
    if (syn.speaking) return // 当前还在播放，等 onend

    const item = queue.shift()!
    const utter = new SpeechSynthesisUtterance(item.text)

    if (item.options) {
      const all = getVoices()
      const opts = item.options

      // 语音包选择
      if (opts.voiceName && all.length > 0) {
        const match = all.find((v) => v.name === opts.voiceName)
        if (match) utter.voice = match
      } else {
        // 优先中文
        const zh = all.find((v) => v.lang.startsWith('zh'))
        if (zh) utter.voice = zh
      }

      if (opts.pitch !== undefined) utter.pitch = opts.pitch / 100   // DB 存 *100
      if (opts.rate !== undefined) utter.rate = opts.rate / 100
      if (opts.volume !== undefined) utter.volume = opts.volume / 100
    } else {
      // 无选项时默认加速
      utter.rate = 1.4
    }

    utter.onend = () => {
      playNext()
    }

    utter.onerror = () => {
      // 出错跳过当前句，继续下一句
      playNext()
    }

    isSpeaking.value = true
    syn.speak(utter)
  }

  /** 加入朗读队列 */
  function speak(text: string, options?: VoiceOptions) {
    if (!text || !enabled.value) return

    queue.push({ text, options })

    const syn = window.speechSynthesis
    if (!syn.speaking) {
      playNext()
    }
  }

  /** 试听（不排队，立即播放并停止之前的） */
  function preview(text: string, options?: VoiceOptions) {
    const syn = window.speechSynthesis
    syn.cancel() // 停止当前 + 清空队列
    queue.length = 0
    isSpeaking.value = false

    const utter = new SpeechSynthesisUtterance(text)

    if (options) {
      const all = getVoices()
      if (options.voiceName) {
        const match = all.find((v) => v.name === options.voiceName)
        if (match) utter.voice = match
      }
      if (options.pitch !== undefined) utter.pitch = options.pitch / 100
      if (options.rate !== undefined) utter.rate = options.rate / 100
      if (options.volume !== undefined) utter.volume = options.volume / 100
    }

    syn.speak(utter)
  }

  /** 停止所有朗读 */
  function stopAll() {
    window.speechSynthesis.cancel()
    queue.length = 0
    isSpeaking.value = false
  }

  /** 开关切换 */
  function toggle() {
    enabled.value = !enabled.value
    if (!enabled.value) {
      stopAll()
    }
  }

  return {
    enabled,
    isSpeaking,
    getVoices,
    getChineseVoices,
    speak,
    preview,
    stopAll,
    toggle,
  }
}
