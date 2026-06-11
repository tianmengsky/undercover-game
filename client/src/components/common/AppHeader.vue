<!--
  AppHeader.vue - 顶部导航栏
  功能：Logo + 导航链接 + 用户信息 + 等级徽章
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import LevelProgress from '@/components/profile/LevelProgress.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

function goLogin() {
  router.push('/login')
}

function goRooms() {
  router.push('/rooms')
}

function goProfile() {
  router.push('/profile')
}

function goLeaderboard() {
  router.push('/leaderboard')
}

function goAchievements() {
  router.push('/achievements')
}

function goPersonas() {
  router.push('/personas')
}

function goHome() {
  router.push('/')
}

function logout() {
  authStore.logout()
  router.push('/')
}

function isActive(path: string): boolean {
  return route.path === path
}

const isInGame = computed(() => route.path.startsWith('/game/'))
</script>

<template>
  <header class="app-header" :class="{ 'is-locked': isInGame }">
    <div class="header-left">
      <span class="logo" @click="!isInGame && goHome()">AI卧底大乱斗</span>
      <nav class="nav-links">
        <button
          :class="['nav-link', { active: isActive('/rooms') }]"
          @click="goRooms"
          :disabled="isInGame"
          v-if="authStore.isAuthenticated"
        >
          房间列表
        </button>
        <button
          :class="['nav-link', { active: isActive('/leaderboard') }]"
          @click="goLeaderboard"
          :disabled="isInGame"
        >
          排行榜
        </button>
        <button
          :class="['nav-link', { active: isActive('/achievements') }]"
          @click="goAchievements"
          :disabled="isInGame"
        >
          成就
        </button>
        <button
          :class="['nav-link', { active: isActive('/personas') }]"
          @click="goPersonas"
          :disabled="isInGame"
        >
          人设工坊
        </button>
        <button
          v-if="authStore.isAuthenticated"
          :class="['nav-link', { active: isActive('/profile') }]"
          @click="goProfile"
          :disabled="isInGame"
        >
          个人中心
        </button>
      </nav>
    </div>
    <div class="header-right">
      <template v-if="authStore.isAuthenticated">
        <span class="user-name" @click="!isInGame && goProfile()" :class="{ clickable: !isInGame }">{{ authStore.user?.nickname || '...' }}</span>
        <LevelProgress
          :level="authStore.user?.level || 1"
          :exp="authStore.user?.exp || 0"
          variant="mini"
        />
        <button class="nav-link" @click="logout" :disabled="isInGame">退出</button>
      </template>
      <button v-else class="btn-login" @click="goLogin">登录</button>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 var(--spacing-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  position: sticky;
  top: 0;
  z-index: 100;
}

.app-header.is-locked .nav-link,
.app-header.is-locked .logo {
  opacity: 0.4;
  pointer-events: none;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-xl);
}

.logo {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-primary);
  cursor: pointer;
  user-select: none;
}

.nav-links {
  display: flex;
  gap: var(--spacing-xs);
}

.nav-link {
  padding: 6px 16px;
  background: none;
  border: none;
  font-size: var(--font-size-base);
  color: var(--color-text-light);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.nav-link:hover {
  color: var(--color-primary);
  background: rgba(79, 172, 254, 0.08);
}

.nav-link.active {
  color: var(--color-primary);
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.user-name {
  font-weight: 500;
  color: var(--color-text);
}

.user-name.clickable {
  cursor: pointer;
}

.user-name.clickable:hover {
  color: var(--color-primary);
}

.btn-login {
  padding: 6px 20px;
  background: var(--color-primary);
  color: var(--color-text-inverse);
  border: none;
  border-radius: var(--radius-round);
  font-size: var(--font-size-base);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.btn-login:hover {
  background: var(--color-primary-dark);
}
</style>
