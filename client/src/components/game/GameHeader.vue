<!--
  GameHeader.vue - 游戏信息栏组件
  功能：轮次信息、存活人数、TTS开关
-->
<template>
  <div class="game-header">
    <div class="header-left">
      <span class="round-badge">{{ currentRound }} / {{ maxRounds }} 轮</span>
      <span class="alive-count">存活 {{ aliveCount }} / {{ totalCount }} 人</span>
      <span v-if="yourWord" class="word-badge">
        🎯 {{ yourRole === 'undercover' ? '卧底' : '平民' }}: <strong>{{ yourWord }}</strong>
      </span>
    </div>
    <div class="header-right">
      <button
        class="tts-btn"
        :class="{ active: ttsEnabled }"
        @click="$emit('toggle-tts')"
        :aria-label="ttsEnabled ? '关闭语音' : '开启语音'"
      >
        <span v-if="ttsEnabled">🔊 朗读</span>
        <span v-else>🔇 禁音</span>
      </button>
      <button class="exit-btn" @click="$emit('exit-room')" title="退出房间">🚪 退出</button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  currentRound: number
  maxRounds: number
  aliveCount: number
  totalCount: number
  ttsEnabled: boolean
  yourWord?: string
  yourRole?: string
}>()

defineEmits<{
  'toggle-tts': []
  'exit-room': []
}>()
</script>

<style scoped>
.game-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-bg-dark);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.round-badge {
  background: var(--color-primary);
  color: var(--color-text-inverse);
  padding: 4px 12px;
  border-radius: var(--radius-round);
  font-size: var(--font-size-base);
  font-weight: 600;
}

.alive-count {
  font-size: var(--font-size-base);
  color: var(--color-text-light);
}

.word-badge {
  padding: 4px 12px;
  border-radius: var(--radius-round);
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.word-badge strong {
  font-size: var(--font-size-base);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.exit-btn {
  padding: 6px 12px;
  border: 1px solid var(--color-bg-dark);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-light);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.exit-btn:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.tts-btn {
  padding: 6px 14px;
  border: 1px solid var(--color-bg-dark);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-light);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.tts-btn:hover {
  border-color: var(--color-primary);
}
.tts-btn.active {
  background: var(--color-primary);
  color: var(--color-text-inverse);
  border-color: var(--color-primary);
  font-weight: 600;
}
</style>
