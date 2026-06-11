<script setup lang="ts">
import { onMounted } from 'vue'
import './assets/styles/variables.css'
import './assets/styles/reset.css'
import './assets/styles/global.css'
import AppHeader from './components/common/AppHeader.vue'
import AppToast from './components/common/AppToast.vue'
import AchievementUnlock from './components/achievements/AchievementUnlock.vue'
import { useAchievement } from './composables/useAchievement'
import { useAuthStore } from './stores/auth'

const authStore = useAuthStore()
const { toast } = useAchievement()

onMounted(() => {
  if (authStore.isAuthenticated) {
    authStore.fetchProfile()
  }
})
</script>

<template>
  <AppHeader />
  <router-view class="app-content" />
  <AchievementUnlock :list="toast" />
  <AppToast />
</template>
