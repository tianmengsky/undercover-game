<!--
  PersonaWorkshopView.vue - AI 人设工坊
  路由：/personas
  功能：自然语言描述创建AI性格、公共工坊浏览、选用/点赞
-->
<template>
  <div class="persona-view">
    <h1 class="pv-title">🧠 AI 人设工坊</h1>

    <!-- ===== 区域1: 创建人设 ===== -->
    <section class="pv-section">
      <h2 class="pv-section-title">创建我的人设</h2>
      <p class="pv-hint">
        本月已创建 <strong>{{ monthUsed }}/3</strong> 个人设。
      </p>

      <!-- 模式切换 -->
      <div class="pv-mode-tabs">
        <button
          :class="['pv-mode-tab', { active: mode === 'quick' }]"
          @click="mode = 'quick'"
        >⚡ 快速生成</button>
        <button
          :class="['pv-mode-tab', { active: mode === 'expert' }]"
          @click="mode = 'expert'"
        >🔧 专家模式</button>
      </div>

      <!-- 快速模式 -->
      <template v-if="mode === 'quick'">
        <p class="pv-mode-hint">用自然语言描述你想要的 AI 对手性格，系统将自动生成 System Prompt。</p>
        <div class="form-group">
          <label>人设名称（可选）</label>
          <input v-model="quickName" class="pv-input" placeholder="留空则自动生成，例：古诗词教授" maxlength="20" />
        </div>
        <div class="pv-tags">
          <button v-for="tag in quickTags" :key="tag" class="pv-tag" @click="description = tag">{{ tag }}</button>
        </div>
        <textarea v-model="description" class="pv-textarea" placeholder="例：一个总爱引用古诗词的老教授，说话文绉绉的，喜欢用之乎者也..." rows="3" />
        <div class="pv-create-actions">
          <button class="btn btn-primary" :disabled="creating || !description.trim().length" @click="handleCreate">
            {{ creating ? '生成中...' : '生成预览' }}
          </button>
        </div>
      </template>

      <!-- 专家模式 -->
      <template v-else>
        <p class="pv-mode-hint">自行填写人设名称和 System Prompt，完全掌控 AI 的发言风格。</p>
        <div class="form-group">
          <label>人设名称</label>
          <input v-model="expertName" class="pv-input" placeholder="例：古诗词教授" maxlength="20" />
        </div>
        <div class="form-group">
          <label>一句话描述</label>
          <input v-model="description" class="pv-input" placeholder="例：一个总爱引用古诗词的老教授" maxlength="100" />
        </div>
        <div class="form-group">
          <label>System Prompt</label>
          <textarea v-model="expertPrompt" class="pv-textarea" placeholder="例：你是一位博学的老教授，说话文绉绉的，喜欢引用古诗词来表达观点。描述时常用比喻和典故，语气儒雅但不做作。" rows="5" />
          <p class="pv-char-count">{{ expertPrompt.length }} 字（建议 30-300 字）</p>
        </div>

        <!-- ===== 语音参数面板 ===== -->
        <div class="pv-voice-panel">
          <h4 class="pv-voice-title">🎤 语音参数</h4>
          <div class="pv-voice-grid">
            <div class="form-group">
              <label>语音包</label>
              <select v-model="voiceName" class="pv-input pv-select">
                <option value="">自动选择（优先中文）</option>
                <option v-for="v in voiceList" :key="v.name" :value="v.name">
                  {{ v.name }} ({{ v.lang }})
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>音调 {{ (voicePitch / 100).toFixed(2) }}</label>
              <input type="range" v-model.number="voicePitch" min="50" max="200" step="5" class="pv-slider" />
            </div>
            <div class="form-group">
              <label>语速 {{ (voiceRate / 100).toFixed(2) }}</label>
              <input type="range" v-model.number="voiceRate" min="50" max="200" step="5" class="pv-slider" />
            </div>
            <div class="form-group">
              <label>音量 {{ (voiceVolume / 100).toFixed(2) }}</label>
              <input type="range" v-model.number="voiceVolume" min="10" max="100" step="10" class="pv-slider" />
            </div>
          </div>
          <button class="btn btn-text-sm" @click="handlePreviewVoice">
            {{ voicePreviewPlaying ? '⏹ 停止' : '▶ 试听' }}
          </button>
          <span v-if="voicePreviewPlaying" class="pv-voice-status">播放中...</span>
        </div>

        <div class="pv-create-actions">
          <button class="btn btn-primary" :disabled="creating || !canSubmitExpert" @click="handleCreateExpert">
            {{ creating ? '创建中...' : '创建人设' }}
          </button>
        </div>
      </template>

      <!-- 预览区 -->
      <div v-if="preview" class="pv-preview">
        <div class="pv-preview-header">
          <span>{{ preview.name }}</span>
          <button class="btn-text-sm" @click="preview = null">重新生成</button>
        </div>
        <p class="pv-preview-prompt">{{ preview.systemPrompt }}</p>
      </div>

      <!-- 我创建的人设列表 -->
      <div v-if="myPersonas.length > 0" class="pv-my-list">
        <h3>我创建的人设（{{ myPersonas.length }}）</h3>
        <div class="pv-card-row" v-for="p in myPersonas" :key="p.id">
          <span class="pv-card-name">{{ p.name }}</span>
          <span class="pv-card-desc">{{ p.description.slice(0, 30) }}...</span>
          <span class="pv-card-stats">❤ {{ p.likeCount }} · 🔄 {{ p.usageCount }}</span>
          <button class="pv-delete-btn" @click="handleDelete(p)">✕</button>
        </div>
      </div>
    </section>

    <!-- ===== 区域2: 公共工坊 ===== -->
    <section class="pv-section">
      <h2 class="pv-section-title">公共工坊</h2>

      <!-- 排序 -->
      <div class="pv-sort">
        <button
          :class="['pv-sort-btn', { active: sort === 'popular' }]"
          @click="sort = 'popular'; fetchPublic()"
        >热门</button>
        <button
          :class="['pv-sort-btn', { active: sort === 'new' }]"
          @click="sort = 'new'; fetchPublic()"
        >最新</button>
      </div>

      <!-- 加载 -->
      <div v-if="loading" class="pv-status">加载中...</div>
      <div v-else-if="error" class="pv-status pv-error">{{ error }}</div>

      <!-- 人设卡片网格 -->
      <div v-else class="pv-grid">
        <div
          v-for="item in publicList"
          :key="item.id"
          class="pv-card"
          :class="{ 'is-liked': item._liked }"
        >
          <div class="pv-card-top">
            <span class="pv-card-name">{{ item.name }}</span>
            <span class="pv-card-author">by {{ item.authorName }}</span>
          </div>
          <p class="pv-card-desc">{{ item.description }}</p>
          <p v-if="item._expanded" class="pv-card-prompt">{{ item.systemPrompt }}</p>
          <button class="btn-text-sm" @click="item._expanded = !item._expanded">
            {{ item._expanded ? '收起预览' : '展开 System Prompt' }}
          </button>
          <div class="pv-card-footer">
            <span class="pv-card-stats">
              🔄 {{ item.usageCount }} · ❤ {{ item.likeCount }}
            </span>
            <div class="pv-card-actions">
              <button
                class="pv-action-btn"
                :class="{ active: item._liked }"
                @click="handleLike(item)"
              >❤</button>
              <button
                class="pv-action-btn primary"
                :class="{ adopted: item._adopted }"
                @click="handleAdopt(item)"
              >{{ item._adopted ? '取消选用' : '选用' }}</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 空 / 分页 -->
      <div v-if="!loading && !error && publicList.length === 0" class="pv-empty">
        还没人创建人设，快来创建第一个吧！
      </div>

      <div v-if="totalPages > 1" class="pv-pagination">
        <button :disabled="page <= 1" @click="page--; fetchPublic()">上一页</button>
        <span>{{ page }} / {{ totalPages }}</span>
        <button :disabled="page >= totalPages" @click="page++; fetchPublic()">下一页</button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { createPersona, getMyPersonas, getPublicPersonas, likePersona, deletePersona } from '@/services/personaService'
import { useToast } from '@/composables/useToast'
import { showAchievementUnlock } from '@/composables/useAchievement'
import { useAuthStore } from '@/stores/auth'
import { useTTS } from '@/composables/useTTS'

const toast = useToast()
const authStore = useAuthStore()
const tts = useTTS()

const description = ref('')
const creating = ref(false)
const preview = ref<{ name: string; systemPrompt: string } | null>(null)
const myPersonas = ref<any[]>([])
const publicList = ref<any[]>([])
const loading = ref(false)
const error = ref('')
const sort = ref('popular')
const page = ref(1)
const pageSize = 12
const totalCount = ref(0)
const monthUsed = ref(0)
const mode = ref<'quick' | 'expert'>('quick')
const quickName = ref('')
const expertName = ref('')
const expertPrompt = ref('')

// Voice state
const voiceName = ref('')
const voicePitch = ref(100)
const voiceRate = ref(100)
const voiceVolume = ref(100)
const voicePreviewPlaying = ref(false)
const voiceList = ref<Array<{ name: string; lang: string }>>([])

const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / pageSize)))
const canSubmitExpert = computed(() =>
  expertName.value.trim().length >= 1 &&
  description.value.trim().length >= 1 &&
  expertPrompt.value.trim().length >= 10,
)

const quickTags = [
  '一个总爱引用古诗词的老教授',
  '一个说话毒舌、一针见血的评论家',
  '一个胆小如鼠、说话结巴的胆小鬼',
  '一个思维缜密、爱分析线索的侦探',
  '一个幽默搞笑、喜欢玩梗的段子手',
  '一个话少冷酷、惜字如金的高冷男神',
]

async function handleCreate() {
  if (!description.value.trim()) return
  creating.value = true
  try {
    const body: any = { description: description.value.trim() }
    if (quickName.value.trim()) body.name = quickName.value.trim()
    const res: any = await createPersona(body)
    if (res.code !== 0) throw new Error(res.message || '创建失败')
    preview.value = {
      name: res.data.name,
      systemPrompt: res.data.systemPrompt,
    }
    if (res.data.newAchievement) {
      showAchievementUnlock([res.data.newAchievement])
      authStore.addExp(res.data.newAchievement.rewardExp || 0)
    }
    description.value = ''
    quickName.value = ''
    monthUsed.value++
    fetchMyPersonas()
  } catch (e: any) {
    error.value = e.message
  } finally {
    creating.value = false
  }
}

async function handleCreateExpert() {
  creating.value = true
  try {
    const res: any = await createPersona({
      description: description.value.trim(),
      name: expertName.value.trim(),
      systemPrompt: expertPrompt.value.trim(),
      voiceName: voiceName.value || undefined,
      voicePitch: voicePitch.value,
      voiceRate: voiceRate.value,
      voiceVolume: voiceVolume.value,
    })
    if (res.code !== 0) throw new Error(res.message || '创建失败')
    preview.value = {
      name: res.data.name,
      systemPrompt: res.data.systemPrompt,
    }
    if (res.data.newAchievement) {
      showAchievementUnlock([res.data.newAchievement])
      authStore.addExp(res.data.newAchievement.rewardExp || 0)
    }
    description.value = ''
    expertName.value = ''
    expertPrompt.value = ''
    monthUsed.value++
    fetchMyPersonas()
  } catch (e: any) {
    error.value = e.message
  } finally {
    creating.value = false
  }
}

async function fetchMyPersonas() {
  try {
    const res: any = await getMyPersonas()
    if (res.code === 0) {
      myPersonas.value = res.data.list || []
      monthUsed.value = myPersonas.value.length
    }
  } catch { /* ignore */ }
}

async function fetchPublic() {
  loading.value = true
  error.value = ''
  try {
    const res: any = await getPublicPersonas({ sort: sort.value, page: page.value, pageSize })
    if (res.code === 0) {
      publicList.value = (res.data.list || []).map((p: any) => ({
        ...p,
        _expanded: false,
        _liked: false,
        _adopted: false,
      }))
      // 标记已选用的人设（按 userId 隔离）
      try {
        const uid = authStore.user?.id
        if (uid) {
          migrateAdoptedKey(uid)
          const raw = localStorage.getItem(`adoptedPersonas_${uid}`)
          if (raw) {
            const adopted: Array<{ id: string }> = JSON.parse(raw)
            const ids = new Set(adopted.map((a) => a.id))
            for (const item of publicList.value) {
              if (ids.has(item.id)) item._adopted = true
            }
          }
        }
      } catch { /* ignore */ }
      totalCount.value = res.data.total || 0
    } else {
      error.value = res.message || '加载失败'
    }
  } catch (e: any) {
    error.value = e.message || '网络错误'
  } finally {
    loading.value = false
  }
}

async function handleLike(item: any) {
  try {
    const res: any = await likePersona(item.id)
    if (res.code === 0) {
      item.likeCount = res.data.likeCount
      item._liked = res.data.liked
    }
  } catch { /* ignore */ }
}

async function handleDelete(p: any) {
  if (!confirm(`确定删除「${p.name}」人设吗？`)) return
  try {
    const res: any = await deletePersona(p.id)
    if (res.code === 0) {
      myPersonas.value = myPersonas.value.filter((m) => m.id !== p.id)
      monthUsed.value = myPersonas.value.length
    } else {
      toast.error(res.message || '删除失败')
    }
  } catch (e: any) {
    toast.error(e.message || '删除失败')
  }
}

/** 旧 key 迁移：adoptedPersonas → adoptedPersonas_${userId} */
function migrateAdoptedKey(uid: string) {
  const oldRaw = localStorage.getItem('adoptedPersonas')
  if (oldRaw && !localStorage.getItem(`adoptedPersonas_${uid}`)) {
    localStorage.setItem(`adoptedPersonas_${uid}`, oldRaw)
    localStorage.removeItem('adoptedPersonas')
  }
}

function handleAdopt(item: any) {
  const uid = authStore.user?.id
  if (!uid) return
  try {
    migrateAdoptedKey(uid)
    const key = `adoptedPersonas_${uid}`
    const raw = localStorage.getItem(key)
    const list: Array<{ id: string; name: string; emoji: string; desc: string }> = raw ? JSON.parse(raw) : []
    if (item._adopted) {
      const filtered = list.filter((p) => p.id !== item.id)
      localStorage.setItem(key, JSON.stringify(filtered))
      item._adopted = false
    } else {
      if (!list.some((p) => p.id === item.id)) {
        list.push({
          id: item.id,
          name: item.name,
          emoji: '🧩',
          desc: item.description.slice(0, 30),
        })
        localStorage.setItem(key, JSON.stringify(list))
      }
      item._adopted = true
    }
  } catch { /* ignore */ }
}

function handlePreviewVoice() {
  if (voicePreviewPlaying.value) {
    tts.stopAll()
    voicePreviewPlaying.value = false
    return
  }
  voicePreviewPlaying.value = true
  const sampleText = `你好，我是${expertName.value || '测试人设'}，这是我的语音风格。`
  tts.preview(sampleText, {
    voiceName: voiceName.value || undefined,
    pitch: voicePitch.value,
    rate: voiceRate.value,
    volume: voiceVolume.value,
  })
  // preview is async, stop flag after ~3s
  setTimeout(() => { voicePreviewPlaying.value = false }, 3000)
}

function loadVoices() {
  const all = tts.getVoices()
  voiceList.value = all.map((v) => ({ name: v.name, lang: v.lang }))
}

onMounted(() => {
  // Load voices (may need delay on Chrome)
  loadVoices()
  window.speechSynthesis?.addEventListener?.('voiceschanged', loadVoices)
  fetchMyPersonas()
  fetchPublic()
})
</script>

<style scoped>
.persona-view {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--spacing-xl) var(--spacing-md) var(--spacing-2xl);
}

.pv-title {
  text-align: center;
  font-size: 28px;
  font-weight: 800;
  color: var(--color-text);
  margin-bottom: var(--spacing-xl);
}

/* ===== 分区 ===== */
.pv-section {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
  margin-bottom: var(--spacing-lg);
}

.pv-section-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: var(--spacing-sm);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--color-bg-dark);
}

.pv-hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  margin-bottom: var(--spacing-sm);
}

.pv-hint strong {
  color: var(--color-primary-dark);
}

/* 模式切换 */
.pv-mode-tabs {
  display: flex;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-md);
}

.pv-mode-tab {
  padding: 6px 20px;
  border: 1px solid var(--color-bg-dark);
  border-radius: var(--radius-round);
  background: var(--color-surface);
  color: var(--color-text-light);
  font-size: var(--font-size-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.pv-mode-tab.active {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

.pv-mode-hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  margin-bottom: var(--spacing-sm);
}

/* 专家模式表单 */
.form-group {
  margin-bottom: var(--spacing-md);
}

.form-group label {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-weight: 500;
  color: var(--color-text);
  font-size: var(--font-size-sm);
}

.pv-input {
  width: 100%;
  height: 40px;
  padding: 0 var(--spacing-sm);
  border: 1px solid var(--color-bg-dark);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  color: var(--color-text);
  background: var(--color-bg);
  font-family: inherit;
  box-sizing: border-box;
  transition: border var(--transition-fast);
}

.pv-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.pv-char-count {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  margin-top: 2px;
}

/* 快速标签 */
.pv-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-sm);
}

.pv-tag {
  padding: 4px 12px;
  border: 1px solid var(--color-bg-dark);
  border-radius: var(--radius-round);
  background: var(--color-bg);
  color: var(--color-text-light);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.pv-tag:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* 输入框 */
.pv-textarea {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--color-bg-dark);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  color: var(--color-text);
  background: var(--color-bg);
  resize: vertical;
  font-family: inherit;
  transition: border var(--transition-fast);
}

.pv-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

/* 创建按钮 */
.pv-create-actions {
  margin-top: var(--spacing-sm);
}

/* 预览区 */
.pv-preview {
  margin-top: var(--spacing-md);
  padding: var(--spacing-md);
  background: #f0faf3;
  border: 1px solid var(--color-success);
  border-radius: var(--radius-md);
}

.pv-preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
  font-weight: 600;
  color: var(--color-text);
}

.pv-preview-prompt {
  font-size: var(--font-size-sm);
  color: var(--color-text);
  line-height: 1.6;
  margin: 0;
  white-space: pre-wrap;
}

/* 我创建的人设 */
.pv-my-list {
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-bg-dark);
}

.pv-my-list h3 {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: var(--spacing-sm);
}

.pv-card-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--color-bg-dark);
  font-size: var(--font-size-sm);
}

.pv-card-row .pv-card-name { font-weight: 600; color: var(--color-text); min-width: 80px; }
.pv-card-row .pv-card-desc { flex: 1; color: var(--color-text-light); }
.pv-card-row .pv-card-stats { color: var(--color-text-light); flex-shrink: 0; }

.pv-delete-btn {
  width: 22px;
  height: 22px;
  border: none;
  border-radius: var(--radius-round);
  background: transparent;
  color: var(--color-text-light);
  font-size: 12px;
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pv-delete-btn:hover {
  background: #fce4ec;
  color: var(--color-danger);
}

/* 排序 */
.pv-sort {
  display: flex;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-md);
}

.pv-sort-btn {
  padding: 4px 16px;
  border: 1px solid var(--color-bg-dark);
  border-radius: var(--radius-round);
  background: var(--color-surface);
  color: var(--color-text-light);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.pv-sort-btn.active {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

/* 状态 */
.pv-status {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-light);
  font-size: var(--font-size-base);
}
.pv-error { color: var(--color-danger); }
.pv-empty {
  text-align: center;
  padding: var(--spacing-2xl);
  color: var(--color-text-light);
}

/* 卡片网格 */
.pv-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
}

@media (max-width: 640px) {
  .pv-grid { grid-template-columns: 1fr; }
}

.pv-card {
  padding: var(--spacing-md);
  border: 1px solid var(--color-bg-dark);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  transition: all var(--transition-fast);
}

.pv-card:hover {
  box-shadow: var(--shadow-sm);
  border-color: var(--color-primary);
}

.pv-card.is-liked {
  border-color: #f9a826;
}

.pv-card-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: var(--spacing-sm);
}

.pv-card .pv-card-name {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text);
}

.pv-card .pv-card-author {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
}

.pv-card .pv-card-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  margin-bottom: var(--spacing-xs);
  line-height: 1.4;
}

.pv-card .pv-card-prompt {
  font-size: var(--font-size-sm);
  color: var(--color-text);
  background: var(--color-bg);
  padding: var(--spacing-sm);
  border-radius: var(--radius-sm);
  margin-bottom: var(--spacing-xs);
  line-height: 1.5;
}

.pv-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--spacing-sm);
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--color-bg-dark);
}

.pv-card-stats {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
}

.pv-card-actions {
  display: flex;
  gap: var(--spacing-xs);
}

.pv-action-btn {
  padding: 4px 12px;
  border: 1px solid var(--color-bg-dark);
  border-radius: var(--radius-round);
  background: var(--color-surface);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--color-text-light);
}

.pv-action-btn:hover { border-color: var(--color-accent); }
.pv-action-btn.active { color: #e74c3c; border-color: #e74c3c; }
.pv-action-btn.primary {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

.pv-action-btn.primary:hover {
  background: var(--color-primary-dark);
}

.pv-action-btn.primary.adopted {
  background: var(--color-surface);
  color: var(--color-danger);
  border-color: var(--color-danger);
}

.pv-action-btn.primary.adopted:hover {
  background: #fce4ec;
}

/* 分页 */
.pv-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--spacing-md);
  padding-top: var(--spacing-md);
}

.pv-pagination button {
  padding: 6px 16px;
  border: 1px solid var(--color-bg-dark);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.pv-pagination button:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.pv-pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
.pv-pagination span { font-size: var(--font-size-sm); color: var(--color-text-light); }

/* 通用按钮 */
.btn {
  padding: 10px 24px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all var(--transition-fast);
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: var(--color-primary); color: #fff; }
.btn-primary:hover:not(:disabled) { background: var(--color-primary-dark); }
.btn-text-sm {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  padding: 0;
}

/* ===== Voice Panel ===== */
.pv-voice-panel {
  margin: var(--spacing-md) 0;
  padding: var(--spacing-md);
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 8px;
  background: var(--card-bg, #fafafa);
}
.pv-voice-title { margin: 0 0 var(--spacing-sm) 0; font-size: 14px; color: var(--color-text); }
.pv-voice-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-sm);
}
.pv-voice-grid .form-group { margin: 0; }
.pv-voice-grid label { font-size: 12px; }
.pv-select { width: 100%; }
.pv-slider { width: 100%; cursor: pointer; }
.pv-voice-status { margin-left: var(--spacing-sm); font-size: 12px; color: var(--primary, #6366f1); }
</style>
