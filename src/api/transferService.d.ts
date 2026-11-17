import type {
  ApproveTransferRequest,
  CellFilters,
  CreateTransferRequest,
  InmateFilters,
  Page,
  PrisonFilters,
  Transfer,
  TransferCell,
  TransferFilters,
  TransferInmate,
  TransferNoteRequest,
  TransferPage,
  TransferPrison,
} from '../types/transfer'

export const transferService: {
  getTransfers: (filters?: TransferFilters) => Promise<TransferPage | Transfer[]>
  createTransfer: (data: CreateTransferRequest) => Promise<Transfer>
  approveTransfer: (id: string, data: ApproveTransferRequest) => Promise<Transfer>
  rejectTransfer: (id: string, data?: TransferNoteRequest) => Promise<Transfer>
  cancelTransfer: (id: string, data?: TransferNoteRequest) => Promise<Transfer>
  getInmates: (filters?: InmateFilters) => Promise<Page<TransferInmate>>
  getPrisons: (filters?: PrisonFilters) => Promise<Page<TransferPrison>>
  getCells: (filters?: CellFilters) => Promise<Page<TransferCell>>
}
