export type TransferStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'IN_TRANSIT'
  | 'RECEIVED'
  | 'CANCELLED'

export interface Transfer {
  id: string
  inmateId: string
  inmateName: string
  sourcePrisonId: string
  sourcePrisonName: string
  destinationPrisonId: string
  destinationPrisonName: string
  reason: string
  status: TransferStatus
  requestedAt: string
  requestedBy: string
  decidedAt: string | null
  decidedBy: string | null
  decisionNote: string | null
  dispatchedAt: string | null
  dispatchedBy: string | null
  receivedAt: string | null
  receivedBy: string | null
  cancelledAt: string | null
  cancelledBy: string | null
}

export interface Page<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
  sort: Array<{ property: string; direction: string }>
}

export type TransferPage = Page<Transfer>

export interface PageableFilters {
  page?: number
  size?: number
  sort?: string | string[]
}

export interface TransferFilters extends PageableFilters {
  status?: TransferStatus
  prisonId?: string
}

export interface InmateFilters extends PageableFilters {
  search?: string
  gender?: string
}

export interface PrisonFilters extends PageableFilters {
  search?: string
  active?: boolean
}

export interface CellFilters extends PageableFilters {
  blockName?: string
  prisonId?: string
  blockId?: string
}

export interface TransferInmate {
  id: string
  firstName: string
  lastName: string
  prisonId: string
  prisonName: string
}

export interface TransferPrison {
  id: string
  name: string
  location: string
  active: boolean
}

export interface TransferCell {
  id: string
  prisonId: string
  blockId: string
  blockName: string
  cellNumber: number
  name: string
  capacity: number
  currentOccupancy: number
  availableSpaces: number
}

export interface CreateTransferRequest {
  inmateId: string
  destinationPrisonId: string
  reason: string
}

export interface ApproveTransferRequest {
  cellId: string
  note?: string
}

export interface TransferNoteRequest {
  note?: string
}
