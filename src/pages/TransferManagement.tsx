
import { useState } from 'react'
import {
  Alert,
  Box,
  Stack,
  Typography,
} from '@mui/material'

import TransferForm from '../components/TransferForm'
import TransferTable from '../components/TransferTable'
import TransferApproval from '../components/TransferApproval'
import TransferHistory from '../components/TransferHistory'
import './transferManagement.css'

import {
  type Transfer,
  type TransferAuditEntry,
  type TransferStatus,
} from '../types/transfer'

function getLocalDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function TransferManagement() {
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [auditEntries, setAuditEntries] =
    useState<TransferAuditEntry[]>([])
  const [selectedTransfer, setSelectedTransfer] =
    useState<Transfer | null>(null)
  const [successMessage, setSuccessMessage] = useState('')

  function recordAudit(
    transferId: number,
    action: string,
    performedBy: string,
    details: string,
  ) {
    const entry: TransferAuditEntry = {
      id: Date.now(),
      transferId,
      action,
      performedBy,
      date: new Date().toLocaleString(),
      details,
    }

    setAuditEntries(current => [entry, ...current])
  }

  function handleCreateTransfer(transfer: Transfer) {
    setTransfers(current => [transfer, ...current])

    recordAudit(
      transfer.id,
      'Transfer requested',
      transfer.requestedBy,
      'Transfer request submitted for supervisory review.',
    )

    setSuccessMessage(
      `Transfer request for ${transfer.inmateName} was created successfully.`,
    )
  }

  function handleStatusChange(
    transferId: number,
    nextStatus: TransferStatus,
  ) {
    const currentTransfer = transfers.find(
      item => item.id === transferId,
    )

    if (!currentTransfer) return

    const allowedTransitions: Record<TransferStatus, TransferStatus[]> = {
      Pending: ['Approved', 'Rejected'],
      Approved: ['In Transit'],
      'In Transit': ['Completed'],
      Completed: [],
      Cancelled: [],
      Rejected: [],
    }

    if (!allowedTransitions[currentTransfer.status].includes(nextStatus)) {
      setSuccessMessage(
        `That transition is not allowed: ${currentTransfer.status} to ${nextStatus}.`,
      )
      return
    }

    const isDecision =
      nextStatus === 'Approved' || nextStatus === 'Rejected'

    const actingOfficer = isDecision
      ? 'Supervisor (Demo)'
      : 'Transfer Officer (Demo)'

    const updatedTransfer: Transfer = {
      ...currentTransfer,
      status: nextStatus,
      approvedBy:
        nextStatus === 'Approved'
          ? actingOfficer
          : currentTransfer.approvedBy,
      transitDate:
        nextStatus === 'In Transit'
          ? getLocalDate()
          : currentTransfer.transitDate,
    }

    setTransfers(current =>
      current.map(item =>
        item.id === transferId ? updatedTransfer : item,
      ),
    )

    const auditDetails: Record<TransferStatus, string> = {
      Pending: 'Transfer request is awaiting supervisory review.',
      Approved: 'Transfer request approved by a demo supervisor.',
      'In Transit': 'Transport movement started and the transit date was recorded.',
      Completed: 'Arrival at the destination facility was recorded.',
      Cancelled: 'Transfer request was cancelled.',
      Rejected: 'Transfer request was rejected by a demo supervisor.',
    }

    recordAudit(
      transferId,
      `Transfer ${nextStatus.toLowerCase()}`,
      actingOfficer,
      auditDetails[nextStatus],
    )

    setSuccessMessage(
      `Transfer for ${currentTransfer.inmateName} is now ${nextStatus}.`,
    )
  }

  function handleApprove(transferId: number) {
    handleStatusChange(transferId, 'Approved')
  }

  function handleReject(transferId: number) {
    handleStatusChange(transferId, 'Rejected')
  }

  function handleMarkInTransit(transferId: number) {
    handleStatusChange(transferId, 'In Transit')
  }

  function handleMarkCompleted(transferId: number) {
    handleStatusChange(transferId, 'Completed')
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

        <TransferHistory
          entries={auditEntries}
          transfers={transfers}
        />

        <TransferApproval
          transfer={selectedTransfer}
          onApprove={handleApprove}
          onReject={handleReject}
          onMarkInTransit={handleMarkInTransit}
          onMarkCompleted={handleMarkCompleted}
          onClose={() => setSelectedTransfer(null)}
        />

        <Typography variant="caption" color="text.secondary">
          Demo mode: transfer and audit data are held in frontend memory.
          Refreshing the page resets changes. Real persistence and
          authorization require backend integration.
        </Typography>
      </Stack>
    </Box>
  )
}

export default TransferManagement
