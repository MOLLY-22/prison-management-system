import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material'

import TransferForm from '../components/TransferForm'
import TransferTable, { type TransferRecord } from '../components/TransferTable'
import TransferApproval from '../components/TransferApproval'
import TransferHistory from '../components/TransferHistory'
import { transferService } from '../api/transferService'
import type {
  ApproveTransferRequest,
  CreateTransferRequest,
  TransferNoteRequest,
} from '../types/transfer'
import './transferManagement.css'

function recordFromResponse(response: unknown): TransferRecord {
  let value = response

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    value = record.data ?? record.result ?? value
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('The server returned an invalid transfer record.')
  }

  return value as TransferRecord
}

function recordsFromResponse(response: unknown): TransferRecord[] {
  let value = response

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    value = record.data ?? record.result ?? value
  }

  if (Array.isArray(value)) return value as TransferRecord[]
  if (value && typeof value === 'object') {
    const content = (value as Record<string, unknown>).content
    if (Array.isArray(content)) return content as TransferRecord[]
  }

  throw new Error('The server returned an invalid transfer list.')
}

function totalPagesFromResponse(response: unknown): number {
  let value = response
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    value = record.data ?? record.result ?? value
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 1

  const totalPages = Number((value as Record<string, unknown>).totalPages)
  return Number.isInteger(totalPages) && totalPages > 1 ? totalPages : 1
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'An unexpected error occurred.'
}

function TransferManagement() {
  const [transfers, setTransfers] = useState<TransferRecord[]>([])
  const [selectedTransfer, setSelectedTransfer] = useState<TransferRecord | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)

  async function fetchTransfers() {
    const firstPage = await transferService.getTransfers({ page: 0, size: 100 })
    const totalPages = totalPagesFromResponse(firstPage)

    if (totalPages === 1) return recordsFromResponse(firstPage)

    const remainingPages = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        transferService.getTransfers({ page: index + 1, size: 100 }),
      ),
    )

    return [
      ...recordsFromResponse(firstPage),
      ...remainingPages.flatMap(recordsFromResponse),
    ]
  }

  async function loadTransfers() {
    setLoading(true)
    setLoadError('')

    try {
      setTransfers(await fetchTransfers())
    } catch (error) {
      setLoadError(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    fetchTransfers()
      .then(records => {
        if (active) setTransfers(records)
      })
      .catch(error => {
        if (active) setLoadError(getErrorMessage(error))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  async function handleCreateTransfer(request: CreateTransferRequest) {
    const response = await transferService.createTransfer(request)
    const createdTransfer = recordFromResponse(response)
    setTransfers(current => [
      createdTransfer,
      ...current.filter(item => item.id !== createdTransfer.id),
    ])
    setSuccessMessage(
      `Transfer request for ${createdTransfer.inmateName} was created successfully.`,
    )
  }

  function replaceTransfer(updatedTransfer: TransferRecord) {
    setTransfers(current =>
      current.map(item => item.id === updatedTransfer.id ? updatedTransfer : item),
    )
    setSelectedTransfer(updatedTransfer)
    setSuccessMessage(
      `Transfer for ${updatedTransfer.inmateName} is now ${updatedTransfer.status.toLowerCase().replace('_', ' ')}.`,
    )
  }

  async function handleApprove(
    transferId: string,
    approvalData: ApproveTransferRequest,
  ) {
    const response = await transferService.approveTransfer(transferId, approvalData)
    replaceTransfer(recordFromResponse(response))
  }

  async function handleReject(transferId: string, data?: TransferNoteRequest) {
    const response = await transferService.rejectTransfer(transferId, data)
    replaceTransfer(recordFromResponse(response))
  }

  async function handleCancel(transferId: string, data?: TransferNoteRequest) {
    const response = await transferService.cancelTransfer(transferId, data)
    replaceTransfer(recordFromResponse(response))
  }

  return (
    <Box className="transfer-workspace" sx={{ p: { xs: 2, md: 4 }, maxWidth: 1600, mx: 'auto' }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Transfer Management
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Create transfer requests, review approvals, track movement, and
            inspect transfer history.
          </Typography>
        </Box>

        {successMessage && (
          <Alert severity="success" onClose={() => setSuccessMessage('')}>
            {successMessage}
          </Alert>
        )}

        {loadError && (
          <Alert severity="error" action={
            <button type="button" onClick={() => void loadTransfers()}>
              Retry
            </button>
          }>
            Could not load transfer records: {loadError}
          </Alert>
        )}

        <TransferForm onSubmit={handleCreateTransfer} />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress aria-label="Loading transfer records" />
          </Box>
        ) : (
          <>
            <TransferTable
              transfers={transfers}
              onSelectTransfer={setSelectedTransfer}
            />

            <TransferHistory transfers={transfers} />
          </>
        )}

        <TransferApproval
          key={selectedTransfer?.id ?? 'closed'}
          transfer={selectedTransfer}
          onApprove={handleApprove}
          onReject={handleReject}
          onCancel={handleCancel}
          onClose={() => setSelectedTransfer(null)}
        />
      </Stack>
    </Box>
  )
}

export default TransferManagement
