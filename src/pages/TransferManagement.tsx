import { useState } from 'react'
import {
  Alert,
  Box,
  Stack,
  Typography,
} from '@mui/material'

import TransferForm from '../components/TransferForm'
import TransferTable, { type TransferRecord, type TransferStatus } from '../components/TransferTable'
import TransferApproval from '../components/TransferApproval'
import TransferHistory from '../components/TransferHistory'
import './transferManagement.css'

interface TransferRequest {
  inmateId: string
  destinationPrisonId: string
  reason: string
}

function buildTransferRecord(request: TransferRequest): TransferRecord {
  const timestamp = new Date().toISOString()
  return {
    id: `TR-${Date.now()}`,
    inmateId: request.inmateId,
    inmateName: `Inmate ${request.inmateId.slice(-4) || request.inmateId}`,
    sourcePrisonName: 'Current Facility',
    destinationPrisonName: `Prison ${request.destinationPrisonId.slice(-4) || request.destinationPrisonId}`,
    destinationPrisonId: request.destinationPrisonId,
    reason: request.reason,
    requestedAt: timestamp,
    status: 'PENDING',
  }
}

function TransferManagement() {
  const [transfers, setTransfers] = useState<TransferRecord[]>([])
  const [selectedTransfer, setSelectedTransfer] = useState<TransferRecord | null>(null)
  const [successMessage, setSuccessMessage] = useState('')

  function handleCreateTransfer(request: TransferRequest) {
    const transfer = buildTransferRecord(request)

    setTransfers(current => [transfer, ...current])
    setSuccessMessage(
      `Transfer request for ${transfer.inmateName} was created successfully.`,
    )
  }

  function handleStatusChange(
    transferId: string,
    nextStatus: TransferStatus,
  ) {
    const currentTransfer = transfers.find(item => item.id === transferId)

    if (!currentTransfer) return

    const allowedTransitions: Record<TransferStatus, TransferStatus[]> = {
      PENDING: ['APPROVED', 'REJECTED'],
      APPROVED: ['IN_TRANSIT'],
      IN_TRANSIT: ['RECEIVED'],
      RECEIVED: [],
      CANCELLED: [],
      REJECTED: [],
    }

    if (!allowedTransitions[currentTransfer.status].includes(nextStatus)) {
      setSuccessMessage(
        `That transition is not allowed: ${currentTransfer.status} to ${nextStatus}.`,
      )
      return
    }

    const updatedTransfer: TransferRecord = {
      ...currentTransfer,
      status: nextStatus,
    }

    setTransfers(current =>
      current.map(item => (item.id === transferId ? updatedTransfer : item)),
    )

    setSuccessMessage(
      `Transfer for ${currentTransfer.inmateName} is now ${nextStatus.toLowerCase().replace('_', ' ')}.`,
    )
  }

  async function handleApprove(
    transferId: string,
    _approvalData: { cellId: string; note?: string },
  ) {
    handleStatusChange(transferId, 'APPROVED')
  }

  async function handleReject(
    transferId: string,
    _data?: { note?: string },
  ) {
    handleStatusChange(transferId, 'REJECTED')
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
          <Alert
            severity={
              successMessage.startsWith('That transition is not allowed')
                ? 'warning'
                : 'success'
            }
            onClose={() => setSuccessMessage('')}
          >
            {successMessage}
          </Alert>
        )}

        <TransferForm onSubmit={handleCreateTransfer} />

        <TransferTable
          transfers={transfers}
          onSelectTransfer={setSelectedTransfer}
        />

        <TransferHistory transfers={transfers} />

        <TransferApproval
          transfer={selectedTransfer}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => setSelectedTransfer(null)}
        />

        <Typography variant="caption" color="text.secondary">
          Demo mode: transfer data is held in frontend memory. Refreshing the page
          resets changes. Real persistence and authorization require backend integration.
        </Typography>
      </Stack>
    </Box>
  )
}

export default TransferManagement
