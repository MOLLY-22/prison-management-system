
type TransferFilters = Record<
  string,
  string | number | boolean | undefined | null
>

export const transferService: {
  getTransfers: (filters?: TransferFilters) => Promise<unknown>

  createTransfer: (data: {
    inmateId: string
    destinationPrisonId: string
    reason: string
  }) => Promise<unknown>

  approveTransfer: (
    id: string,
    data: { cellId: string; note?: string },
  ) => Promise<unknown>

  rejectTransfer: (
    id: string,
    data?: { note?: string },
  ) => Promise<unknown>

  cancelTransfer: (
    id: string,
    data?: { note?: string },
  ) => Promise<unknown>

  getInmates: (filters?: TransferFilters) => Promise<unknown>
  getPrisons: (filters?: TransferFilters) => Promise<unknown>
  getCells: (filters?: TransferFilters) => Promise<unknown>
}
