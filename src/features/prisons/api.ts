import axios from 'axios'
import { API_BASE_URL, clearSession, getToken } from '../../api/session'

export type Cell = { id: string; cellNumber: number; capacity: number; currentOccupancy: number; availableSpaces: number }
export type Block = { id: string; name: string; cells: Cell[] }
export type PrisonSummary = { id: string; name: string; location: string | null; active: boolean }
export type PrisonDetail = PrisonSummary & { blocks: Block[] }
export type CellInput = { cellNumber: number; capacity: number }
export type BlockInput = { name: string; cells: CellInput[] }
export type PrisonInput = { name: string; location?: string; blocks: BlockInput[] }
export type PrisonPage = { records: PrisonSummary[]; totalPages: number; totalElements: number }
export type ActiveFilter = 'all' | 'active' | 'inactive'

export const PAGE_SIZE = 20

type Page<T> = { content: T[]; page: number; size: number; totalElements: number; totalPages: number }
type ApiCell = { id: string; cellNumber?: number; capacity?: number; currentOccupancy?: number; availableSpaces?: number }
type ApiBlock = { id: string; name: string; cells?: ApiCell[] }
type ApiPrison = { id: string; name: string; location?: string | null; active?: boolean; blocks?: ApiBlock[] }

const http = axios.create({ baseURL: API_BASE_URL })

http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use((res) => res, (error) => {
  if (axios.isAxiosError(error) && error.response?.status === 401 && getToken()) {
    clearSession()
    window.location.reload()
  }
  return Promise.reject(error)
})

export const errorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    if (typeof error.response?.data?.message === 'string') return error.response.data.message as string
    if (error.response?.status === 403) return 'Your account does not have permission for this action.'
    if (error.response?.status === 409) return 'This conflicts with existing data (for example a duplicate block name or cell number).'
    if (!error.response) return 'Cannot reach the server.'
  }
  return fallback
}

const toSummary = (raw: ApiPrison): PrisonSummary => ({ id: raw.id, name: raw.name, location: raw.location ?? null, active: raw.active ?? true })

const toDetail = (raw: ApiPrison): PrisonDetail => ({
  ...toSummary(raw),
  blocks: (raw.blocks ?? []).map((block) => ({
    id: block.id,
    name: block.name,
    cells: (block.cells ?? []).map((cell) => {
      const capacity = cell.capacity ?? 0
      const occupied = cell.currentOccupancy ?? 0
      return { id: cell.id, cellNumber: cell.cellNumber ?? 0, capacity, currentOccupancy: occupied, availableSpaces: cell.availableSpaces ?? Math.max(capacity - occupied, 0) }
    }),
  })),
})

export async function fetchPrisons(page: number, search: string, active: ActiveFilter): Promise<PrisonPage> {
  const { data } = await http.get<Page<ApiPrison> | ApiPrison[]>('/prisons', {
    params: { page, size: PAGE_SIZE, search: search || undefined, active: active === 'all' ? undefined : active === 'active' },
  })
  const list = Array.isArray(data) ? data : data.content
  return { records: list.map(toSummary), totalPages: Array.isArray(data) ? 1 : data.totalPages, totalElements: Array.isArray(data) ? list.length : data.totalElements }
}

export async function fetchPrison(id: string): Promise<PrisonDetail> {
  const { data } = await http.get<ApiPrison>(`/prisons/${id}`)
  return toDetail(data)
}

export async function createPrison(payload: PrisonInput) {
  await http.post('/prisons', payload)
}

export async function updatePrison(id: string, payload: { name: string; location?: string }) {
  await http.patch(`/prisons/${id}`, payload)
}

export async function addBlock(prisonId: string, payload: BlockInput) {
  await http.post(`/prisons/${prisonId}/blocks`, payload)
}

// Cells sent here are appended to the block, not a replacement.
export async function updateBlock(prisonId: string, blockId: string, payload: { name: string; cells?: CellInput[] }) {
  await http.patch(`/prisons/${prisonId}/blocks/${blockId}`, payload)
}
