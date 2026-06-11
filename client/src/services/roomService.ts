import { api } from './api'
import type { ApiResponse } from './api'

export interface RoomInfo {
  roomCode: string
  roomName: string
  playerCount: number
  status: string
  hostName: string
}

export interface RoomListResponse {
  rooms: RoomInfo[]
}

export interface JoinRoomResponse {
  gameId: string
  roomCode: string
  roomName: string
  yourSlotIndex: number
}

export const roomService = {
  /** 获取房间列表 */
  async getRoomList(): Promise<ApiResponse<RoomListResponse>> {
    return api('/rooms')
  },

  /** 通过房间号加入房间 */
  async joinRoom(roomCode: string, nickname: string): Promise<ApiResponse<JoinRoomResponse>> {
    return api('/rooms/join', { method: 'POST', body: { roomCode, nickname } })
  },
}
