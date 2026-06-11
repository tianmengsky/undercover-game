<!--
  PlayerList.vue - 玩家列表组件
  功能：头像+名称+状态标签排列，发言中高亮，已淘汰灰化
-->
<template>
  <div class="player-list">
    <div
      v-for="player in players"
      :key="player.slotIndex"
      class="player-item"
      :class="{
        'is-speaking': isSpeaking && player.slotIndex === currentSpeakerIndex,
        'is-eliminated': !player.isAlive,
      }">
      <div class="player-avatar">
        <span class="avatar-text">{{ player.customName.charAt(0) }}</span>
        <span v-if="!player.isAlive" class="eliminated-overlay">✕</span>
      </div>
      <div class="player-info">
        <span class="player-name">{{ player.customName }}</span>
        <AIPersonaTag v-if="player.type === 'ai' && player.aiPersona" :persona="player.aiPersona" />
      </div>
      <div class="player-status">
        <span v-if="!player.isAlive" class="status-eliminated">已淘汰</span>
        <span v-else-if="isSpeaking && player.slotIndex === currentSpeakerIndex" class="status-speaking">发言中</span>
        <span v-else-if="player.hasSpokenThisRound" class="status-spoken">已发言</span>
        <span v-else-if="player.hasVotedThisRound" class="status-voted">已投票</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Player } from '@/types/game'
import AIPersonaTag from './AIPersonaTag.vue'

const props = defineProps<{
  players: Player[]
  currentSpeakerIndex: number
  isSpeaking: boolean
  isVoting: boolean
  votedPlayers: Set<number>
}>()

// PlayerList 不再处理 vote emit — 投票由 VotePanel 中央面板处理
</script>

<style scoped>
.player-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
}

.player-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  transition: all var(--transition-fast);
  border: 2px solid transparent;
}

.player-item.is-speaking {
  border-color: var(--color-primary);
  box-shadow: 0 0 12px rgba(79, 172, 254, 0.35);
  animation: speak-pulse 1.5s ease-in-out infinite;
}

.player-item.is-eliminated {
  opacity: 0.45;
  pointer-events: none;
}

@keyframes speak-pulse {
  0%, 100% { box-shadow: 0 0 8px rgba(79, 172, 254, 0.25); }
  50% { box-shadow: 0 0 20px rgba(79, 172, 254, 0.5); }
}

.player-avatar {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-round);
  background: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-text {
  color: var(--color-text-inverse);
  font-size: var(--font-size-lg);
  font-weight: 700;
}

.eliminated-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  border-radius: var(--radius-round);
  color: white;
  font-size: 18px;
  font-weight: 700;
}

.player-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.player-name {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-status {
  margin-left: auto;
  flex-shrink: 0;
}

.status-speaking {
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  font-weight: 600;
}

.status-spoken {
  font-size: var(--font-size-sm);
  color: var(--color-success);
}

.status-voted {
  font-size: var(--font-size-sm);
  color: var(--color-accent);
}

.status-eliminated {
  font-size: var(--font-size-sm);
  color: var(--color-danger);
}
</style>
