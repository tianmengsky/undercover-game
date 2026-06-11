/**
 * chat.ts - 发言/消息记录 (Pinia Store)
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Speech } from '@/types/game'

export const useChatStore = defineStore('chat', () => {
  const messages = ref<Speech[]>([])

  function addMessage(speech: Speech) {
    messages.value.push(speech)
  }

  function addAISpeechChunk(slotIndex: number, chunk: string) {
    const last = messages.value[messages.value.length - 1]
    if (last && last.slotIndex === slotIndex && last.isAI && last.round === last.round) {
      last.content += chunk
    }
  }

  function getCurrentRoundSpeeches(round: number): Speech[] {
    return messages.value.filter((s) => s.round === round)
  }

  function reset() {
    messages.value = []
  }

  return { messages, addMessage, addAISpeechChunk, getCurrentRoundSpeeches, reset }
})
