<!-- RoomListItem.vue - 房间列表条目 -->
<template>
  <div class="room-item" :class="{ playing: room.status === 'playing' }">
    <span class="room-icon">🏠</span>
    <div class="room-info">
      <span class="room-name">{{ room.roomName }}</span>
      <span class="room-code">房间号: {{ room.roomCode }}</span>
    </div>
    <div class="room-dots">{{ dots }}</div>
    <span class="room-count">{{ room.playerCount }}/6</span>
    <span class="room-status" :class="room.status">{{ statusText }}</span>
    <button
      v-if="canRejoin"
      class="join-btn rejoin-btn"
      @click="$emit('join', room.roomCode)"
    >重新加入</button>
    <button
      v-else-if="room.status === 'waiting' && room.playerCount < 6"
      class="join-btn"
      @click="$emit('join', room.roomCode)"
    >加入</button>
    <span v-else-if="room.status !== 'waiting'" class="full-text">游戏中</span>
    <span v-else class="full-text">满员</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  room: {
    roomCode: string
    roomName: string
    playerCount: number
    status: string
    hostName: string
  }
  canRejoin?: boolean
}>()

defineEmits<{
  join: [roomCode: string]
}>()

const dots = computed(() => {
  const filled = '●'.repeat(props.room.playerCount)
  const empty = '○'.repeat(6 - props.room.playerCount)
  return filled + empty
})

const statusText = computed(() => props.room.status === 'waiting' ? '等待中' : '游戏中')
</script>

<style scoped>
.room-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-fast);
}

.room-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.room-item.playing {
  opacity: 0.7;
}

.room-icon {
  font-size: 24px;
}

.room-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.room-name {
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text);
}

.room-item.playing .room-name {
  color: var(--color-text-light);
}

.room-code {
  font-size: var(--font-size-xs);
  color: var(--color-text-light);
  font-family: monospace;
}

.room-dots {
  font-size: var(--font-size-base);
  color: var(--color-primary);
  letter-spacing: 2px;
}

.room-count {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
}

.room-status {
  font-size: var(--font-size-xs);
  padding: 2px 8px;
  border-radius: var(--radius-round);
  font-weight: 600;
}

.room-status.waiting {
  background: var(--color-success);
  color: #fff;
}

.room-status.playing {
  background: var(--color-text-light);
  color: #fff;
}

.join-btn {
  padding: 6px 16px;
  border: none;
  border-radius: var(--radius-round);
  background: var(--color-primary);
  color: #fff;
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.join-btn:hover {
  background: var(--color-primary-dark);
}

.rejoin-btn {
  background: var(--color-accent);
}

.rejoin-btn:hover {
  background: #e6951a;
}

.full-text {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  font-weight: 600;
}
</style>

