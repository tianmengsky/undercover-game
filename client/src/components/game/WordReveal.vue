<!--
  WordReveal.vue - 词语揭示翻转动画组件
  功能：平民词 vs 卧底词的卡片翻转揭示
-->
<template>
  <div class="word-reveal">
    <div class="word-card word-card-civilian" :class="{ flipped: revealed }">
      <div class="word-card-inner">
        <div class="word-card-front">?</div>
        <div class="word-card-back">
          <span class="word-text">{{ civilianWord }}</span>
          <span class="word-label">平民词</span>
        </div>
      </div>
    </div>
    <div class="word-vs">VS</div>
    <div class="word-card word-card-undercover" :class="{ flipped: revealed }">
      <div class="word-card-inner">
        <div class="word-card-front">?</div>
        <div class="word-card-back">
          <span class="word-text">{{ undercoverWord }}</span>
          <span class="word-label">卧底词</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  civilianWord: string
  undercoverWord: string
  revealed: boolean
}>()
</script>

<style scoped>
.word-reveal {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  margin: var(--spacing-xl) 0;
}

.word-card {
  width: 200px;
  height: 120px;
  perspective: 800px;
  cursor: default;
}

.word-card-inner {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.6s ease;
}

.word-card.flipped .word-card-inner {
  transform: rotateY(180deg);
}

.word-card-front,
.word-card-back {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg);
  backface-visibility: hidden;
}

.word-card-front {
  background: var(--color-bg-dark);
  color: var(--color-text-light);
  font-size: 40px;
  font-weight: 700;
}

.word-card-back {
  transform: rotateY(180deg);
  color: #fff;
  gap: 6px;
}

.word-card-civilian .word-card-back {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
}

.word-card-undercover .word-card-back {
  background: linear-gradient(135deg, #f44336, #c62828);
}

.word-text {
  font-size: 28px;
  font-weight: 800;
}

.word-label {
  font-size: var(--font-size-sm);
  opacity: 0.85;
}

.word-vs {
  font-size: 24px;
  font-weight: 800;
  color: var(--color-text-light);
}
</style>
