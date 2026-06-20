/**
 * personaService.ts - AI人设工坊 REST API
 */
import { api } from './api'

export function createPersona(data: { description: string; name?: string; systemPrompt?: string; voiceName?: string; voicePitch?: number; voiceRate?: number; voiceVolume?: number }) {
  return api('/personas', { method: 'POST', body: data })
}

export function getPublicPersonas(params?: { sort?: string; page?: number; pageSize?: number }) {
  const query = new URLSearchParams()
  if (params?.sort) query.set('sort', params.sort)
  if (params?.page) query.set('page', String(params.page))
  if (params?.pageSize) query.set('pageSize', String(params.pageSize))
  const qs = query.toString()
  return api(`/personas${qs ? '?' + qs : ''}`)
}

export function getMyPersonas() {
  return api('/personas/my')
}

export function likePersona(personaId: string) {
  return api(`/personas/${personaId}/like`, { method: 'POST', body: {} })
}

export function deletePersona(personaId: string) {
  return api(`/personas/${personaId}`, { method: 'DELETE', body: {} })
}
