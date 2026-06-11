/**
 * useAchievement.ts - 成就数据与交互逻辑
 *
 * 功能：
 * - 加载成就定义 + 用户已解锁列表
 * - 按分类筛选
 * - 全局成就解锁 Toast（跨 View 共享）
 */
import { ref, computed } from 'vue'
import { getAchievements, getUserAchievements } from '@/services/achievementService'
import { useAuthStore } from '@/stores/auth'

// 全局 toast 单例（跨所有 useAchievement 实例共享）
const globalToast = ref<Array<{ name: string; icon: string }>>([])

/** 弹出全局成就解锁动画（任意位置调用） */
export function showAchievementUnlock(achievements: Array<{ name: string; icon: string }>) {
  globalToast.value = achievements
  setTimeout(() => { globalToast.value = [] }, 4000)
}

export function useAchievement() {
  const authStore = useAuthStore()

  const allAchievements = ref<any[]>([])
  const unlockedIds = ref<Set<string>>(new Set())
  const loading = ref(false)
  const error = ref('')
  const filter = ref<string>('all')
  const toast = globalToast

  const totalCount = computed(() => allAchievements.value.length)
  const unlockedCount = computed(() => unlockedIds.value.size)

  const filteredAchievements = computed(() => {
    let list = allAchievements.value.map((a) => ({
      ...a,
      _unlocked: unlockedIds.value.has(a.id),
    }))
    if (filter.value !== 'all') {
      list = list.filter((a) => a.category === filter.value)
    }
    return list
  })

  async function fetch() {
    loading.value = true
    error.value = ''
    try {
      const [defRes, userRes]: any[] = await Promise.all([
        getAchievements(),
        authStore.isAuthenticated
          ? getUserAchievements(authStore.user!.id)
          : Promise.resolve({ code: 0, data: { achievements: [] } }),
      ])

      if (defRes.code === 0) {
        allAchievements.value = defRes.data.achievements || []
      } else {
        error.value = defRes.message || '加载失败'
        return
      }

      if (userRes.code === 0) {
        const list = userRes.data.achievements || []
        unlockedIds.value = new Set(list.map((a: any) => a.id))
      }
    } catch (e: any) {
      error.value = e.message || '网络错误'
    } finally {
      loading.value = false
    }
  }

  return {
    allAchievements,
    unlockedIds,
    loading,
    error,
    filter,
    toast,
    totalCount,
    unlockedCount,
    filteredAchievements,
    fetch,
  }
}
