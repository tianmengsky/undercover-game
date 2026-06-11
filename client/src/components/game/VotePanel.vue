<!--
  VotePanel.vue - 投票面板（中央区域）
  功能：候选人网格卡片、双击确认、票型柱状图、倒计时联动
-->
<template>
  <div class="vote-panel">
    <!-- ===== 候选人网格（始终显示，已投票后置灰） ===== -->
    <h3 class="vote-title">🗳 投票：选出你最怀疑的人</h3>

    <div class="candidates-grid">
      <div
        v-for="candidate in candidates"
        :key="candidate.slotIndex"
        class="candidate-card"
        :class="{
          'is-self': isSelf(candidate.slotIndex),
          'is-selected': selectedSlot === candidate.slotIndex,
          'is-voted': hasVoted,
          'is-voted-target': hasVoted && localMyVote === candidate.slotIndex,
        }"
        @click="handleClick(candidate.slotIndex)"
      >
        <div class="card-avatar">
          <span class="avatar-text">{{ candidate.customName.charAt(0) }}</span>
          <span v-if="isVotedByOther(candidate.slotIndex)" class="voted-check">✓</span>
        </div>
        <div class="card-name">{{ candidate.customName }}</div>
        <AIPersonaTag
          v-if="candidate.type === 'ai' && candidate.aiPersona"
          :persona="candidate.aiPersona"
        />
        <div v-if="selectedSlot === candidate.slotIndex" class="confirm-hint">
          再点一次确认投票给【{{ candidate.customName }}】
        </div>
      </div>
    </div>

    <!-- ===== 实时票型（始终显示，每次 vote_cast 即时更新） ===== -->
    <div class="tally-section">
      <h4 class="tally-title">📊 实时票型（{{ votedCount }} / {{ totalVoters }} 人已投票）</h4>
      <div class="tally-list">
        <div
          v-for="item in tallyItems"
          :key="item.slotIndex"
          class="tally-row"
          :class="{ 'is-top': item.isTop }"
        >
          <span class="tally-name">{{ item.name }}</span>
          <div class="tally-bar-track">
            <div
              class="tally-bar-fill"
              :class="{ 'is-top': item.isTop }"
              :style="{ width: item.pct + '%' }"
            />
          </div>
          <span class="tally-count">{{ item.count }} 票</span>
        </div>
      </div>
      <div v-if="isTie" class="tie-notice">⚖️ 平票！无人淘汰</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Player } from '@/types/game'
import AIPersonaTag from './AIPersonaTag.vue'

const props = defineProps<{
  candidates: Player[]
  mySlotIndex: number
  myVote: number | null
  hasVoted: boolean
  voteTally: Record<number, number>
  votedCount: number
  totalVoters: number
  isTie: boolean
  isMyTurn: boolean
}>()

const emit = defineEmits<{
  'vote': [targetSlot: number]
}>()

const selectedSlot = ref<number | null>(null)
const localMyVote = ref<number | null>(null)

watch(() => props.myVote, (v) => {
  if (v !== null) localMyVote.value = v
})

watch(() => props.hasVoted, (v) => {
  if (!v) {
    selectedSlot.value = null
    localMyVote.value = null
  }
})

function isSelf(slotIndex: number) {
  return slotIndex === props.mySlotIndex
}

function isVotedByOther(slotIndex: number) {
  return Object.keys(props.voteTally).some(
    (k) => Number(k) === slotIndex && (props.voteTally[Number(k)] || 0) > 0,
  )
}

function handleClick(slotIndex: number) {
  if (props.hasVoted || isSelf(slotIndex) || !props.isMyTurn) return

  if (selectedSlot.value === slotIndex) {
    // 第二次点击 → 确认投票
    localMyVote.value = slotIndex
    emit('vote', slotIndex)
  } else {
    // 第一次点击 → 高亮
    selectedSlot.value = slotIndex
  }
}

// 票型列表（按票数降序）
const tallyItems = computed(() => {
  const max = Math.max(1, ...Object.values(props.voteTally))
  return props.candidates
    .filter((c) => c.isAlive)
    .map((c) => ({
      slotIndex: c.slotIndex,
      name: c.customName,
      count: props.voteTally[c.slotIndex] || 0,
      pct: ((props.voteTally[c.slotIndex] || 0) / max) * 100,
      isTop: (props.voteTally[c.slotIndex] || 0) === Math.max(...Object.values(props.voteTally), 0) && (props.voteTally[c.slotIndex] || 0) > 0,
    }))
    .sort((a, b) => b.count - a.count)
})
</script>

<style scoped>
.vote-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--spacing-lg);
  background: var(--color-bg);
  overflow-y: auto;
}

.vote-title {
  text-align: center;
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: var(--spacing-lg);
}

/* ===== 候选人网格 ===== */
.candidates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  flex-shrink: 0;
}

.candidate-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  border: 2px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;
}

.candidate-card.is-self {
  opacity: 0.4;
  cursor: not-allowed;
}

.candidate-card.is-voted {
  opacity: 0.5;
  pointer-events: none;
}

.candidate-card.is-voted-target {
  border-color: var(--color-success) !important;
  opacity: 0.8;
}

.candidate-card.is-voted-target .card-avatar {
  background: var(--color-success);
}

.candidate-card:hover:not(.is-self):not(.is-voted) {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.candidate-card.is-selected {
  border-color: var(--color-accent);
  box-shadow: 0 0 14px rgba(249, 168, 38, 0.3);
  animation: select-pulse 0.8s ease-in-out infinite;
}

@keyframes select-pulse {
  0%, 100% { box-shadow: 0 0 8px rgba(249, 168, 38, 0.2); }
  50% { box-shadow: 0 0 20px rgba(249, 168, 38, 0.5); }
}

.card-avatar {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-round);
  background: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
}

.avatar-text {
  color: #fff;
  font-size: 20px;
  font-weight: 700;
}

.voted-check {
  position: absolute;
  right: -4px;
  bottom: -4px;
  width: 20px;
  height: 20px;
  border-radius: var(--radius-round);
  background: var(--color-success);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-name {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text);
  text-align: center;
}

.confirm-hint {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 6px;
  padding: 4px 10px;
  background: var(--color-accent);
  color: #fff;
  font-size: var(--font-size-sm);
  border-radius: var(--radius-sm);
  white-space: nowrap;
  z-index: 10;
}

/* ===== 实时票型区域 ===== */
.tally-section {
  border-top: 1px solid var(--color-bg-dark);
  padding-top: var(--spacing-md);
  flex-shrink: 0;
}

.tally-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-light);
  margin-bottom: var(--spacing-sm);
  text-align: center;
}

/* 票型柱状图 */
.tally-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.tally-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.tally-name {
  width: 70px;
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text);
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tally-bar-track {
  flex: 1;
  height: 24px;
  background: var(--color-bg-dark);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.tally-bar-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: var(--radius-sm);
  transition: width 0.6s ease;
  min-width: 4px;
}

.tally-bar-fill.is-top {
  background: var(--color-danger);
  animation: tally-glow 0.6s ease-in-out infinite alternate;
}

@keyframes tally-glow {
  from { box-shadow: 0 0 4px rgba(231, 76, 60, 0.3); }
  to { box-shadow: 0 0 12px rgba(231, 76, 60, 0.6); }
}

.tally-count {
  width: 40px;
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text);
  flex-shrink: 0;
  text-align: right;
}

.tie-notice {
  text-align: center;
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-accent);
  margin-top: var(--spacing-md);
}
</style>
