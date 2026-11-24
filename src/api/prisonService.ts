import api from "./axiosClient";
import { resolveCellAvailability } from "../utils/cellAvailability";

export type StationGender = "MALE" | "FEMALE";


export type Cell = {
  id: string; cellNumber: number; capacity: number; currentOccupancy: number; availableSpaces: number
}
export type Block = {
  id: string; name: string; cells: Cell[]
}
export type PrisonSummary = {
  id: string; name: string; location: string | null; active: boolean; gender: StationGender | null
}
export type PrisonDetail = PrisonSummary & { blocks: Block[] }
export type CellInput = { cellNumber: number; capacity: number }
export type BlockInput = { name: string; cells: CellInput[] }
export type PrisonInput = { name: string; location?: string; gender: StationGender; blocks: BlockInput[] }
export type PrisonPage = { records: PrisonSummary[]; totalPages: number; totalElements: number }
export type ActiveFilter = 'all' | 'active' | 'inactive'

export const PAGE_SIZE = 20

type Page<T> = { content: T[]; page: number; size: number; totalElements: number; totalPages: number }
type ApiCell = { id: string; cellNumber?: number; cell_number?: number; capacity?: number; currentOccupancy?: number; current_occupancy?: number; availableSpaces?: number; available_spaces?: number }
type ApiBlock = { id: string; name: string; cells?: ApiCell[] }
type ApiPrison = { id: string; name: string; location?: string | null; active?: boolean; gender?: string | null; stationGender?: string | null; station_gender?: string | null; blocks?: ApiBlock[] }


const normalizeGender = (value?: string | null): StationGender | null => {
  const gender = value?.trim().toUpperCase();
  return gender === "MALE" || gender === "FEMALE" ? gender : null;
};

const toSummary = (raw: ApiPrison): PrisonSummary => ({
  id: raw.id,
  name: raw.name,
  location: raw.location ?? null,
  active: raw.active ?? true,
  gender: normalizeGender(raw.gender ?? raw.stationGender ?? raw.station_gender),
});

const toDetail = (raw: ApiPrison): PrisonDetail => ({
  ...toSummary(raw),
  blocks: (raw.blocks ?? []).map((block) => ({
    id: block.id,
    name: block.name,
    cells: (block.cells ?? []).map((cell) => {
      const capacity = cell.capacity ?? 0
      const occupied = cell.currentOccupancy ?? cell.current_occupancy ?? 0
      const reportedAvailable = cell.availableSpaces ?? cell.available_spaces
      return { id: cell.id, cellNumber: cell.cellNumber ?? cell.cell_number ?? 0, capacity, currentOccupancy: occupied, availableSpaces: resolveCellAvailability(capacity, occupied, reportedAvailable) }
    }),
  })),
})

export const prisonService = {
  getPrisons: async (
    page: number,
    search: string,
    active: ActiveFilter,
    size = PAGE_SIZE,
  ): Promise<PrisonPage> => {
    const { data } = await api.get<Page<ApiPrison> | ApiPrison[]>('/prisons', {
      params: { page, size, search: search || undefined, active: active === 'all' ? undefined : active === 'active' },
    })
    const list = Array.isArray(data) ? data : data.content
    return { records: list.map(toSummary), totalPages: Array.isArray(data) ? 1 : data.totalPages, totalElements: Array.isArray(data) ? list.length : data.totalElements }
  },

  getPrison: async (id: string): Promise<PrisonDetail> => {
    const { data } = await api.get<ApiPrison>(`/prisons/${id}`)
    return toDetail(data)
  },

  createPrison: async (payload: PrisonInput) => {
    await api.post('/prisons', payload)
  },

  updatePrison: async (id: string, payload: { name: string; location?: string; gender: StationGender }) => {
    await api.patch(`/prisons/${id}`, payload)
  },

  addBlock: async (prisonId: string, payload: BlockInput) => {
    await api.post(`/prisons/${prisonId}/blocks`, payload)
  },

  // Cells sent here are appended to the block, not a replacement.
  updateBlock: async (prisonId: string, blockId: string, payload: { name: string; cells?: CellInput[] }) => {
    await api.patch(`/prisons/${prisonId}/blocks/${blockId}`, payload)
  }
}
