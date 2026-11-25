import axios from 'axios'
import { API_BASE_URL, clearSession, getToken } from '../../api/session'

export type CustodyStatus = 'Active Sentence' | 'Sentence Ended'
export type Inmate = {
  id: string; firstName: string; lastName: string; fullName: string; dateOfBirth: string
  offense: string; sentence: string; block: string; cell: string; status: CustodyStatus
  admissionDate: string; prisonId: string; cellId: string
}
export type Transfer = { id: string; name: string; inmateId: string; court: string; time: string; escort: string }
export type AdmissionPayload = {
  firstName: string; lastName: string; dateOfBirth: string; admissionDate: string
  offence: string; sentenceStartDate: string; sentenceEndDate: string; prisonId: string; cellId: string
}
export type EditPayload = { firstName: string; lastName: string; dateOfBirth: string; admissionDate: string }
export type Prison = { id: string; name: string }
export type CellOption = { id: string; label: string }
export type InmatePage = { records: Inmate[]; page: number; totalPages: number; totalElements: number }

export const PAGE_SIZE = 20

// No prison admits both genders, so gender is a deployment setting, not a form field.
const INMATE_GENDER = import.meta.env.VITE_INMATE_GENDER ?? ''

type Page<T> = { content: T[]; page: number; size: number; totalElements: number; totalPages: number }
type ApiInmate = {
  id: string; firstName: string; lastName: string; dateOfBirth: string; admissionDate: string; offence: string
  sentenceDurationValue?: number; sentenceDurationUnit?: string; sentenceEndDate?: string
  prisonId?: string; prisonName?: string; cellId?: string
}
type ApiCell = { id: string; blockName?: string; cellNumber?: number; capacity?: number; availableSpaces?: number }

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

export const httpStatus = (error: unknown) => (axios.isAxiosError(error) ? error.response?.status : undefined)

export const errorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    if (typeof error.response?.data?.message === 'string') return error.response.data.message as string
    if (error.response?.status === 403) return 'Your account does not have permission for this action.'
    if (!error.response) return 'Cannot reach the server.'
  }
  return fallback
}

let cellCache: Map<string, ApiCell> | null = null

async function cellMap() {
  if (cellCache) return cellCache
  const map = new Map<string, ApiCell>()
  let page = 0
  let totalPages = 1
  while (page < totalPages && page < 20) {
    const { data } = await http.get<Page<ApiCell>>('/cells', { params: { page, size: 100 } })
    data.content.forEach((cell) => map.set(cell.id, cell))
    totalPages = data.totalPages
    page += 1
  }
  cellCache = map
  return map
}

const today = () => new Date().toLocaleDateString('en-CA')

function toInmate(raw: ApiInmate, cells: Map<string, ApiCell>): Inmate {
  const cell = raw.cellId ? cells.get(raw.cellId) : undefined
  const sentence = raw.sentenceDurationValue ? `${raw.sentenceDurationValue} ${String(raw.sentenceDurationUnit ?? '').toLowerCase()}`.trim() : '—'
  return {
    id: raw.id,
    firstName: raw.firstName,
    lastName: raw.lastName,
    fullName: `${raw.firstName} ${raw.lastName}`.trim(),
    dateOfBirth: raw.dateOfBirth,
    offense: raw.offence,
    sentence,
    block: cell?.blockName ?? raw.prisonName ?? '—',
    cell: cell?.cellNumber != null ? `Cell ${cell.cellNumber}` : '',
    status: raw.sentenceEndDate && raw.sentenceEndDate < today() ? 'Sentence Ended' : 'Active Sentence',
    admissionDate: raw.admissionDate,
    prisonId: raw.prisonId ?? '',
    cellId: raw.cellId ?? '',
  }
}

export async function fetchInmates(page: number, search: string): Promise<InmatePage> {
  cellCache = null
  const [{ data }, cells] = await Promise.all([
    http.get<Page<ApiInmate>>('/inmates', { params: { page, size: PAGE_SIZE, search: search || undefined, sort: 'admissionDate,desc' } }),
    cellMap().catch(() => new Map<string, ApiCell>()),
  ])
  return { records: data.content.map((raw) => toInmate(raw, cells)), page: data.page, totalPages: data.totalPages, totalElements: data.totalElements }
}

export async function createInmate(payload: AdmissionPayload): Promise<Inmate> {
  const { data } = await http.post<ApiInmate>('/inmates', { ...payload, gender: INMATE_GENDER })
  cellCache = null
  const cells = await cellMap().catch(() => new Map<string, ApiCell>())
  return toInmate(data, cells)
}

// PATCH accepts only firstName, lastName, dateOfBirth, gender, admissionDate. Offence, sentence and cell can't be edited here.
export async function updateInmate(id: string, payload: EditPayload) {
  const { data } = await http.patch<ApiInmate>(`/inmates/${id}`, payload)
  return data
}

export async function moveInmateCell(id: string, cellId: string) {
  const { data } = await http.put(`/inmates/${id}/cell-allocation`, { cellId })
  cellCache = null
  return data
}

export async function fetchPrisons(): Promise<Prison[]> {
  const { data } = await http.get<Page<Prison> | Prison[]>('/prisons', { params: { size: 100, active: true } })
  const list = Array.isArray(data) ? data : data.content
  return list.map((prison) => ({ id: prison.id, name: prison.name }))
}

export async function fetchPrisonCells(prisonId: string, excludeCellId?: string): Promise<CellOption[]> {
  const { data } = await http.get<{ blocks: { name: string; cells: ApiCell[] }[] }>(`/prisons/${prisonId}`)
  return data.blocks.flatMap((block) =>
    block.cells
      .filter((cell) => cell.id !== excludeCellId && (cell.availableSpaces ?? 1) > 0)
      .map((cell) => ({ id: cell.id, label: `${block.name} · Cell ${cell.cellNumber} (${cell.availableSpaces ?? '?'} free)` })),
  )
}

// Transfer field names beyond id/status are not spelled out in the guide, so several likely keys are tried.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = Record<string, any>
const text = (...values: unknown[]) => (values.find((v) => typeof v === 'string' && v) as string | undefined) ?? '—'

export const fetchTransfers = () =>
  http.get('/transfers', { params: { status: 'PENDING', size: 100 } }).then((res) => {
    const list: Raw[] = Array.isArray(res.data) ? res.data : res.data.content ?? []
    return list.map((t): Transfer => {
      const when = t.requestedAt ?? t.requestedOn ?? t.createdAt
      return {
        id: String(t.id),
        name: text(t.inmateName),
        inmateId: String(t.inmateId ?? ''),
        court: text(t.destinationPrisonName),
        time: when ? new Date(when).toLocaleString() : '—',
        escort: text(t.status),
      }
    })
  })
