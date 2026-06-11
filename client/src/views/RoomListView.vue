<!-- RoomListView.vue - 房间列表页 /rooms -->
<template>
  <div class="room-list-view">
    <!-- 创建房间卡片 -->
    <div class="create-card">
      <h3 class="card-title">创建房间</h3>
      <button class="refresh-btn" @click="fetchRooms">刷新列表</button>
      <div class="form-row">
        <label class="form-label">房间名称</label>
        <input
          v-model="createForm.roomName"
          class="form-input"
          :placeholder="defaultRoomName"
          maxlength="12"
        />
      </div>
      <div class="form-row">
        <label class="form-label">房间号</label>
        <div class="code-row">
          <input
            v-model="createForm.roomCode"
            class="form-input code-input"
            placeholder="留空自动生成"
            maxlength="6"
          />
          <button class="random-btn" @click="generateRoomCode">🎲 随机</button>
        </div>
      </div>
      <button
        class="create-btn"
        @click="handleCreate"
      >创建房间</button>
      <div v-if="createError" class="error-text">{{ createError }}</div>
    </div>

    <!-- 房间列表 -->
    <div class="room-list-section">
      <h3 class="section-title">房间列表 ({{ rooms.length }})</h3>

      <div v-if="loading" class="loading">加载中...</div>

      <div v-else-if="rooms.length === 0" class="empty-state">
        <span class="empty-icon">🏠</span>
        <p>还没有房间，创建一个吧！</p>
      </div>

      <div v-else class="room-list">
        <RoomListItem
          v-for="room in rooms"
          :key="room.roomCode"
          :room="room"
          :can-rejoin="hasJoinedRoom(room.roomCode)"
          @join="handleJoin"
        />
      </div>
    </div>

    <!-- 底部直接加入 -->
    <div class="join-bar">
      <input
        v-model="joinCode"
        class="form-input join-input"
        placeholder="输入 6 位房间号..."
        maxlength="6"
        @keyup.enter="handleJoinByCode"
      />
      <button class="join-btn" @click="handleJoinByCode" :disabled="joinCode.length !== 6">加入房间</button>
      <div v-if="joinError" class="error-text">{{ joinError }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { roomService, type RoomInfo } from '@/services/roomService'
import { createGame } from '@/services/gameService'
import RoomListItem from '@/components/room/RoomListItem.vue'

const router = useRouter()
const authStore = useAuthStore()

const rooms = ref<RoomInfo[]>([])
const loading = ref(false)
const createError = ref('')
const joinError = ref('')

const createForm = ref({
  roomName: '',
  roomCode: '',
})

const joinCode = ref('')

const myNickname = computed(() => authStore.user?.nickname || '玩家')
const defaultRoomName = computed(() => `${myNickname.value}的房间`)

function hasJoinedRoom(roomCode: string): boolean {
  try { return !!sessionStorage.getItem('joinedRoom_' + roomCode) } catch { return false }
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  createForm.value.roomCode = code
}

async function fetchRooms() {
  loading.value = true
  try {
    const res = await roomService.getRoomList()
    if (res.code === 0) {
      rooms.value = res.data?.rooms || []
    }
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  createError.value = ''
  try {
    const res: any = await createGame({
      roomName: createForm.value.roomName || defaultRoomName.value,
      roomCode: createForm.value.roomCode || undefined,
      nickname: myNickname.value,
    })
    if (res.code === 0) {
      const code = res.data.roomCode || createForm.value.roomCode
      if (code) sessionStorage.setItem(`joinedRoom_${code}`, '1')
      sessionStorage.setItem(`humanSlot_${res.data.gameId}`, '0')
      router.push(`/room/${res.data.gameId}`)
    } else {
      createError.value = res.message || '创建失败'
    }
  } catch (e: any) {
    createError.value = e.message || '创建失败'
  }
}

async function handleJoin(roomCode: string) {
  joinError.value = ''
  try {
    const res = await roomService.joinRoom(roomCode, myNickname.value)
    if (res.code === 0) {
      if (res.data!.roomCode) sessionStorage.setItem(`joinedRoom_${res.data!.roomCode}`, '1')
      sessionStorage.setItem(`humanSlot_${res.data!.gameId}`, String(res.data!.yourSlotIndex))
      router.push(`/room/${res.data!.gameId}`)
    } else {
      joinError.value = res.message || '加入失败'
    }
  } catch (e: any) {
    joinError.value = e.message || '加入失败'
  }
}

async function handleJoinByCode() {
  if (joinCode.value.length !== 6) return
  await handleJoin(joinCode.value.toUpperCase())
}

onMounted(() => {
  fetchRooms()
})
</script>

<style scoped>
.room-list-view {
  max-width: 640px;
  margin: 0 auto;
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.create-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
  position: relative;
}

.card-title {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: var(--spacing-md);
}

.refresh-btn {
  position: absolute;
  top: var(--spacing-lg);
  right: var(--spacing-lg);
  border: none;
  background: transparent;
  color: var(--color-primary);
  cursor: pointer;
  font-size: var(--font-size-sm);
}

.form-row {
  margin-bottom: var(--spacing-md);
}

.form-label {
  display: block;
  font-size: var(--font-size-sm);
  color: var(--color-text);
  margin-bottom: var(--spacing-xs);
  font-weight: 600;
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-bg-dark);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  background: var(--color-bg);
  color: var(--color-text);
  outline: none;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: var(--color-primary);
}

.form-input::placeholder {
  color: var(--color-text-light);
  opacity: 0.5;
  font-weight: 400;
}

.code-row {
  display: flex;
  gap: var(--spacing-sm);
}

.code-input {
  font-size: 24px;
  font-weight: 700;
  font-family: monospace;
  text-align: center;
  letter-spacing: 4px;
}

.code-input::placeholder {
  font-size: var(--font-size-sm);
  font-weight: 400;
  letter-spacing: 1px;
}

.random-btn {
  padding: 8px 16px;
  border: 1px solid var(--color-bg-dark);
  border-radius: var(--radius-md);
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
  font-size: var(--font-size-sm);
}

.create-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: var(--radius-round);
  background: var(--color-primary);
  color: #fff;
  font-size: var(--font-size-base);
  font-weight: 700;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.create-btn:hover {
  background: var(--color-primary-dark);
}

.error-text {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-xs);
}

.room-list-section {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
}

.section-title {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: var(--spacing-md);
}

.loading {
  text-align: center;
  color: var(--color-text-light);
  padding: var(--spacing-lg);
}

.empty-state {
  text-align: center;
  padding: var(--spacing-2xl);
  color: var(--color-text-light);
}

.empty-icon {
  font-size: 80px;
  display: block;
  margin-bottom: var(--spacing-md);
  opacity: 0.5;
}

.room-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.join-bar {
  display: flex;
  gap: var(--spacing-sm);
  align-items: flex-start;
  flex-wrap: wrap;
}

.join-input {
  flex: 1;
  min-width: 160px;
  font-family: monospace;
  font-size: 18px;
  text-align: center;
  letter-spacing: 4px;
}

.join-input::placeholder {
  font-size: var(--font-size-sm);
  letter-spacing: 0;
}

.join-btn {
  padding: 8px 24px;
  border: none;
  border-radius: var(--radius-round);
  background: var(--color-primary);
  color: #fff;
  font-size: var(--font-size-base);
  font-weight: 600;
  cursor: pointer;
}

.join-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
