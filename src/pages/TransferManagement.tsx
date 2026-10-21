
import { useState } from 'react'
import {
  Alert,
  Box,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material'

import TransferForm from '../components/transfers/TransferForm'
import TransferTable from '../components/transfers/TransferTable'
import TransferApproval from '../components/transfers/TransferApproval'
import TransferHistory from '../components/transfers/TransferHistory'

import {
  mockTransfers,
  mockTransferAudit,
  type Transfer,
  type TransferAuditEntry,
  type TransferStatus,
} from '../data/transferMockData'

function getLocalDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function TransferManagement() {
  const [transfers, setTransfers] = useState<Transfer[]>(mockTransfers)
  const [auditEntries, setAuditEntries] =
    useState<TransferAuditEntry[]>(mockTransferAudit)
  const [selectedTransfer, setSelectedTransfer] =
    useState<Transfer | null>(null)
  const [successMessage, setSuccessMessage] = useState('')

  // Calculate these values from the current transfer records.
  const totalTransfers = transfers.length
  const pendingApprovals = transfers.filter(
    transfer => transfer.status === 'Pending',
  ).length
  const activeTransits = transfers.filter(
    transfer => transfer.status === 'In Transit',
  ).length
  const completedTransfers = transfers.filter(
    transfer => transfer.status === 'Completed',
  ).length

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
      'In Transit':
        'Transport movement started and the transit date was recorded.',
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

  const statistics = [
    {
      label: 'Total Transfers',
      value: totalTransfers,
      description: 'All recorded requests',
      color: '#1d4ed8',
      background: '#eff6ff',
    },
    {
      label: 'Pending Approvals',
      value: pendingApprovals,
      description: 'Awaiting review',
      color: '#b45309',
      background: '#fffbeb',
    },
    {
      label: 'Active Transits',
      value: activeTransits,
      description: 'Currently in transit',
      color: '#0369a1',
      background: '#f0f9ff',
    },
    {
      label: 'Completed Transfers',
      value: completedTransfers,
      description: 'Marked as completed',
      color: '#15803d',
      background: '#f0fdf4',
    },
  ]

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        px: { xs: 2, sm: 3, lg: 4 },
        py: { xs: 2, md: 3 },
        backgroundColor: '#f8fafc',
      }}
    >
      <Stack spacing={3} sx={{ maxWidth: 1600, mx: 'auto' }}>
        {/* Page heading */}
        <Box
          sx={{
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box>
            <Typography
              variant="overline"
              sx={{
                color: '#64748b',
                fontWeight: 700,
                letterSpacing: 1.4,
              }}
            >
              OPERATIONS / TRANSFERS
            </Typography>

            <Typography
              variant="h4"
              sx={{
                mt: 0.5,
                color: '#172033',
                fontWeight: 750,
                fontSize: { xs: '1.65rem', md: '2rem' },
              }}
            >
              Transfer Management
            </Typography>

            <Typography
              sx={{
                mt: 1,
                color: '#64748b',
                maxWidth: 720,
                fontSize: '0.95rem',
              }}
            >
              Manage transfer requests, review approvals, track inmate
              movements and inspect the transfer audit history.
            </Typography>
          </Box>

          <Chip
            label="DEMO MODE"
            size="small"
            sx={{
              fontWeight: 700,
              color: '#475569',
              backgroundColor: '#e2e8f0',
              borderRadius: 1,
            }}
          />
        </Box>

        {/* Statistics */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(4, minmax(0, 1fr))',
            },
            gap: 2,
          }}
        >
          {statistics.map(statistic => (
            <Paper
              key={statistic.label}
              elevation={0}
              sx={{
                p: { xs: 2, md: 2.5 },
                minWidth: 0,
                border: '1px solid #e2e8f0',
                borderRadius: 2,
                backgroundColor: '#ffffff',
              }}
            >
              <Typography
                sx={{
                  color: '#64748b',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                }}
              >
                {statistic.label}
              </Typography>

              <Typography
                sx={{
                  mt: 1,
                  color: statistic.color,
                  fontSize: { xs: '1.8rem', md: '2.1rem' },
                  lineHeight: 1.2,
                  fontWeight: 750,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {statistic.value}
              </Typography>

              <Typography
                sx={{
                  mt: 0.75,
                  color: '#64748b',
                  fontSize: '0.78rem',
                }}
              >
                {statistic.description}
              </Typography>

              <Box
                sx={{
                  mt: 2,
                  height: 4,
                  width: 44,
                  borderRadius: 2,
                  backgroundColor: statistic.background,
                }}
              />
            </Paper>
          ))}
        </Box>

        {/* Status messages */}
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

        {/* Request form and movement table */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              lg: 'minmax(320px, 0.85fr) minmax(0, 1.65fr)',
            },
            alignItems: 'start',
            gap: 3,
            '& > *': {
              minWidth: 0,
            },
          }}
        >
          <TransferForm onSubmit={handleCreateTransfer} />

          <TransferTable
            transfers={transfers}
            onSelectTransfer={setSelectedTransfer}
          />
        </Box>

        {/* Audit history */}
        <TransferHistory
          entries={auditEntries}
          transfers={transfers}
        />

        {/* Demo limitation notice */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            border: '1px solid #e2e8f0',
            borderRadius: 2,
            backgroundColor: '#ffffff',
          }}
        >
          <Typography
            sx={{
              color: '#64748b',
              fontSize: '0.8rem',
              lineHeight: 1.7,
            }}
          >
            Demo mode: transfer and audit data are held in frontend memory.
            Refreshing the page resets changes. Real persistence and
            authorization require backend integration.
          </Typography>
        </Paper>

        <TransferApproval
          transfer={selectedTransfer}
          onApprove={handleApprove}
          onReject={handleReject}
          onMarkInTransit={handleMarkInTransit}
          onMarkCompleted={handleMarkCompleted}
          onClose={() => setSelectedTransfer(null)}
        />
      </Stack>
    </Box>
  )
}

export default TransferManagement
