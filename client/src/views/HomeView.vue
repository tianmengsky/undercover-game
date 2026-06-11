<!--
  HomeView.vue - 首页（产品介绍 + 入口）

  功能：游戏 Logo/Slogan、规则简介（卡片式 3 步说明）、
        「开始游戏」「排行榜」按钮、已登录显示用户名+等级徽章

  路由：/
  权限：公开
-->
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

/** 3 步规则说明 */
const steps = [
  {
    title: '分配身份',
    desc: '6 名玩家随机分配身份——5 个平民 + 1 个卧底。每个平民拿到相同词语，卧底拿到的词语略有不同。',
    icon: '🎭',
  },
  {
    title: '轮流描述',
    desc: '每位玩家用一句话描述自己的词语，不能直接说出。AI 智能体将根据人设风格发言，你需要从中找出破绽。',
    icon: '💬',
  },
  {
    title: '投票淘汰',
    desc: '所有存活玩家投票选出最可疑的人。淘汰卧底则平民获胜，卧底存活到最后则逆袭翻盘。',
    icon: '🗳️',
  },
]

function goToLobby() {
  router.push('/rooms')
}

function goToLeaderboard() {
  router.push('/leaderboard')
}
</script>

<template>
  <div class="home-view">
    <!-- 主标题区域 -->
    <section class="hero">
      <h1 class="hero-title">AI 谁是卧底大乱斗</h1>
      <p class="hero-subtitle">与 大模型 AI 同台飙戏，看谁能骗过谁</p>
      <div class="hero-actions">
        <button class="btn btn-primary" @click="goToLobby">开始游戏</button>
        <button class="btn btn-outline" @click="goToLeaderboard">排行榜</button>
      </div>
    </section>

    <!-- 规则说明 -->
    <section class="how-to-play">
      <h2 class="section-title">游戏规则</h2>
      <div class="steps-grid">
        <div v-for="(step, index) in steps" :key="index" class="step-card">
          <span class="step-icon">{{ step.icon }}</span>
          <span class="step-num">{{ index + 1 }}</span>
          <h3 class="step-title">{{ step.title }}</h3>
          <p class="step-desc">{{ step.desc }}</p>
        </div>
      </div>
    </section>

    <!-- 特色亮点 -->
    <section class="features">
      <h2 class="section-title">为什么玩这个？</h2>
      <div class="features-grid">
        <div class="feature-item">
          <h3>多种 AI 人设</h3>
          <p>幽默达人、逻辑大师、萌新小白...每个 AI 都有独特的发言风格</p>
        </div>
        <div class="feature-item">
          <h3>自定义人设工坊</h3>
          <p>用自然语言创造独一无二的 AI 对手，让每局都新鲜</p>
        </div>
        <div class="feature-item">
          <h3>游戏回放复盘</h3>
          <p>查看 AI 心理活动旁白，体会卧底的内心挣扎</p>
        </div>
        <div class="feature-item">
          <h3>成就与排行榜</h3>
          <p>解锁 12 种成就徽章，冲击全服排名</p>
        </div>
      </div>
    </section>

    <!-- 页脚 -->
    <footer class="home-footer">
      <p>AI 谁是卧底大乱斗 &copy; 2026</p>
    </footer>
  </div>
</template>

<style scoped>
.home-view {
  min-height: 100vh;
  padding-bottom: var(--spacing-2xl);
}

/* ── 主标题区域 ── */
.hero {
  text-align: center;
  padding: var(--spacing-2xl) var(--spacing-md);
  background: linear-gradient(135deg, var(--color-primary), #2d8cf0);
  color: var(--color-text-inverse);
}

.hero-title {
  font-size: 36px;
  font-weight: 800;
  margin-bottom: var(--spacing-sm);
  letter-spacing: 2px;
}

.hero-subtitle {
  font-size: var(--font-size-lg);
  opacity: 0.9;
  margin-bottom: var(--spacing-xl);
}

.hero-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: center;
}

.btn {
  padding: 12px 32px;
  border-radius: var(--radius-round);
  font-size: var(--font-size-lg);
  font-weight: 600;
  transition: all var(--transition-fast);
}

.btn-primary {
  background: var(--color-surface);
  color: var(--color-primary);
  box-shadow: var(--shadow-md);
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.btn-outline {
  background: transparent;
  color: var(--color-text-inverse);
  border: 2px solid rgba(255, 255, 255, 0.6);
}
.btn-outline:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: #fff;
}

/* ── 规则说明 ── */
.how-to-play,
.features {
  max-width: 1000px;
  margin: 0 auto;
  padding: var(--spacing-2xl) var(--spacing-md);
}

.section-title {
  text-align: center;
  font-size: var(--font-size-2xl);
  font-weight: 700;
  margin-bottom: var(--spacing-xl);
  color: var(--color-text);
}

.steps-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-lg);
}

.step-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl) var(--spacing-lg);
  text-align: center;
  box-shadow: var(--shadow-sm);
  position: relative;
  transition: transform var(--transition-fast);
}

.step-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}

.step-icon {
  font-size: 40px;
  display: block;
  margin-bottom: var(--spacing-sm);
}

.step-num {
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-md);
  font-size: 48px;
  font-weight: 800;
  color: var(--color-bg-dark);
  line-height: 1;
}

.step-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  margin-bottom: var(--spacing-xs);
  color: var(--color-primary-dark);
}

.step-desc {
  color: var(--color-text-light);
  font-size: var(--font-size-sm);
  line-height: 1.7;
}

/* ── 特色亮点 ── */
.features-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
}

.feature-item {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  border-left: 4px solid var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.feature-item h3 {
  font-size: var(--font-size-base);
  font-weight: 600;
  margin-bottom: var(--spacing-xs);
  color: var(--color-text);
}

.feature-item p {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
}

/* ── 页脚 ── */
.home-footer {
  text-align: center;
  padding: var(--spacing-lg);
  color: var(--color-text-light);
  font-size: var(--font-size-sm);
}

/* ── 响应式 ── */
@media (max-width: 768px) {
  .steps-grid {
    grid-template-columns: 1fr;
  }
  .features-grid {
    grid-template-columns: 1fr;
  }
  .hero-title {
    font-size: 24px;
  }
}
</style>
