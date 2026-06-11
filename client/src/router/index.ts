import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
    },
    {
      path: '/lobby',
      redirect: '/rooms',
    },
    {
      path: '/rooms',
      name: 'rooms',
      component: () => import('../views/RoomListView.vue'),
    },
    {
      path: '/room/:roomId',
      name: 'room',
      component: () => import('../views/RoomView.vue'),
    },
    {
      path: '/game/:gameId',
      name: 'game',
      component: () => import('../views/GameView.vue'),
    },
    {
      path: '/result/:gameId',
      name: 'result',
      component: () => import('../views/ResultView.vue'),
    },
    {
      path: '/replay/:gameId',
      name: 'replay',
      component: () => import('../views/ReplayView.vue'),
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/ProfileView.vue'),
    },
    {
      path: '/achievements',
      name: 'achievements',
      component: () => import('../views/AchievementView.vue'),
    },
    {
      path: '/personas',
      name: 'personas',
      component: () => import('../views/PersonaWorkshopView.vue'),
    },
    {
      path: '/leaderboard',
      name: 'leaderboard',
      component: () => import('../views/LeaderboardView.vue'),
    },
  ],
})

// 需要登录才能访问的路由
const protectedPaths = ['/lobby', '/rooms', '/room', '/game', '/result', '/replay', '/profile', '/achievements', '/personas']

router.beforeEach((to) => {
  const token = sessionStorage.getItem('accessToken')
  const needsAuth = protectedPaths.some((p) => to.path.startsWith(p))

  if (needsAuth && !token) {
    // Vue Router 4 推荐用 return 代替 next()
    return '/login'
  }
  // 返回 true 或 undefined = 放行
})

export default router
