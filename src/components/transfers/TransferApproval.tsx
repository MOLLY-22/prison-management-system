import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from '@mui/material'

import type { Transfer } from '../../data/transferMockData'

interface TransferApprovalProps {
  transfer: Transfer | null
  onApprove: (transferId: number) => void
  onReject: (transferId: number) => void
  onMarkInTransit: (transferId: number) => void
  onMarkCompleted: (transferId: number) => void
  onClose: () => void
}

type ApprovalAction = 'approve' | 'reject' | 'in-transit' | 'complete'

function getStatusColor(
  status: Transfer['status'],
): 'default' | 'info' | 'success' | 'warning' | 'error' | 'primary' {
  switch (status) {
    case 'Pending':
      return 'warning'
    case 'Approved':
      return 'info'
    case 'In Transit':
      return 'primary'
    case 'Completed':
      return 'success'
    case 'Rejected':
      return 'error'
    case 'Cancelled':
      return 'default'
  }
}

function TransferApproval({
  transfer,
  onApprove,
  onReject,
  onMarkInTransit,
  onMarkCompleted,
  onClose,
}: TransferApprovalProps) {
  const [confirmationAction, setConfirmationAction] =
    useState<ApprovalAction | null>(null)

  function handleConfirm() {
    if (!transfer || !confirmationAction) return

    switch (confirmationAction) {
      case 'approve':
        onApprove(transfer.id)
        break
      case 'reject':
        onReject(transfer.id)
        break
      case 'in-transit':
        onMarkInTransit(transfer.id)
        break
      case 'complete':
        onMarkCompleted(transfer.id)
        break
    }

    setConfirmationAction(null)
    onClose()
  }

  function handleClose() {
    setConfirmationAction(null)
    onClose()
  }

  const statusDescription: Record<Transfer['status'], string> = {
    Pending:
      'This request is waiting for a supervisor to approve or reject it.',
    Approved:
      'This transfer has been authorized. Mark it In Transit when the movement actually begins.',
    'In Transit':
      'The inmate is being transported. Mark the transfer Completed only after arrival has been recorded.',
    Completed:
      'This transfer has been completed. Its status is read-only.',
    Rejected:
      'A supervisor rejected this request. It cannot proceed to transport.',
    Cancelled:
      'This request was cancelled or withdrawn. It cannot proceed to transport.',
  }

  const confirmationText: Record<ApprovalAction, string> = {
    approve: `Approve the transfer for ${transfer?.inmateName}?`,
    reject: `Reject the transfer request for ${transfer?.inmateName}?`,
    'in-transit': `Record that the transfer for ${transfer?.inmateName} has started?`,
    complete: `Confirm that ${transfer?.inmateName} has arrived at the destination facility?`,
  }

  const confirmationTitle: Record<ApprovalAction, string> = {
    approve: 'Confirm Approval',
    reject: 'Confirm Rejection',
    'in-transit': 'Confirm Transfer Started',
    complete: 'Confirm Arrival and Completion',
  }

  return (
    <>
      <Dialog
        open={Boolean(transfer)}
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
        aria-labelledby="transfer-review-title"
      >
        <DialogTitle
          id="transfer-review-title"
          sx={{
            px: 3,
            py: 2.5,
            color: '#172033',
            fontWeight: 750,
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          Review Transfer
          {transfer && (
            <Typography
              variant="body2"
              sx={{ mt: 0.5, color: '#64748b', fontWeight: 400 }}
            >
              Transfer ID: {transfer.id}
            </Typography>
          )}
        </DialogTitle>

        <DialogContent
          dividers
          sx={{ p: { xs: 2, sm: 3 }, backgroundColor: '#f8fafc' }}
        >
          {transfer && (
            <Stack spacing={2}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  borderColor: '#e2e8f0',
                  backgroundColor: '#ffffff',
                }}
              >
                <Stack
                  direction="row"
                  sx={{
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 1,
                  }}
                >
                  <Box>
                    <Typography
                      variant="overline"
                      sx={{
                        color: '#64748b',
                        fontWeight: 700,
                        letterSpacing: 1,
                      }}
                    >
                      INMATE DETAILS
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{ color: '#172033', fontWeight: 750 }}
                    >
                      {transfer.inmateName}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                      {transfer.inmateNumber}
                    </Typography>
                  </Box>

                  <Chip
                    label={transfer.status}
                    color={getStatusColor(transfer.status)}
                    size="small"
                    sx={{ fontWeight: 700 }}
                  />
                </Stack>
              </Paper>

              <Alert
                severity={
                  transfer.status === 'Pending'
                    ? 'warning'
                    : transfer.status === 'Rejected' ||
                        transfer.status === 'Cancelled'
                      ? 'error'
                      : transfer.status === 'Completed'
                        ? 'success'
                        : 'info'
                }
                sx={{ borderRadius: 1.5, alignItems: 'flex-start' }}
              >
                {statusDescription[transfer.status]}
              </Alert>

              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  borderColor: '#e2e8f0',
                  backgroundColor: '#ffffff',
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 2, color: '#172033', fontWeight: 750 }}
                >
                  Movement Information
                </Typography>

                <Stack spacing={1.75}>
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: '#64748b', fontWeight: 600 }}
                    >
                      ORIGIN FACILITY
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#172033' }}>
                      {transfer.originFacility}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: '#64748b', fontWeight: 600 }}
                    >
                      DESTINATION FACILITY
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#172033' }}>
                      {transfer.destinationFacility}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: '#64748b', fontWeight: 600 }}
                    >
                      SECURITY LEVEL
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip
                        label={transfer.securityLevel}
                        variant="outlined"
                        size="small"
                        sx={{
                          color: '#334155',
                          borderColor: '#cbd5e1',
                          fontWeight: 600,
                        }}
                      />
                    </Box>
                  </Box>

                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: '#64748b', fontWeight: 600 }}
                    >
                      REASON FOR TRANSFER
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: '#172033', lineHeight: 1.6 }}
                    >
                      {transfer.reason}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>

              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  borderColor: '#e2e8f0',
                  backgroundColor: '#ffffff',
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 2, color: '#172033', fontWeight: 750 }}
                >
                  Request and Approval Details
                </Typography>

                <Stack spacing={1.75}>
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: '#64748b', fontWeight: 600 }}
                    >
                      REQUESTED BY
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#172033' }}>
                      {transfer.requestedBy}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: '#64748b', fontWeight: 600 }}
                    >
                      REQUEST DATE
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#172033' }}>
                      {transfer.requestDate}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: '#64748b', fontWeight: 600 }}
                    >
                      APPROVED BY
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#172033' }}>
                      {transfer.approvedBy ?? 'Not approved'}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: '#64748b', fontWeight: 600 }}
                    >
                      TRANSIT DATE
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#172033' }}>
                      {transfer.transitDate ?? 'Not started'}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Stack>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            p: 2,
            flexWrap: 'wrap',
            gap: 1,
            borderTop: '1px solid #e2e8f0',
          }}
        >
          <Button onClick={handleClose} color="inherit">
            Close
          </Button>

          {transfer?.status === 'Pending' && (
            <>
              <Button
                color="error"
                variant="outlined"
                onClick={() => setConfirmationAction('reject')}
              >
                Reject
              </Button>
              <Button
                variant="contained"
                onClick={() => setConfirmationAction('approve')}
                sx={{ backgroundColor: '#1d4ed8' }}
              >
                Approve Transfer
              </Button>
            </>
          )}

          {transfer?.status === 'Approved' && (
            <Button
              variant="contained"
              onClick={() => setConfirmationAction('in-transit')}
              sx={{ backgroundColor: '#1d4ed8' }}
            >
              Mark In Transit
            </Button>
          )}

          {transfer?.status === 'In Transit' && (
            <Button
              variant="contained"
              color="success"
              onClick={() => setConfirmationAction('complete')}
            >
              Mark Completed
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmationAction !== null}
        onClose={() => setConfirmationAction(null)}
        fullWidth
        maxWidth="xs"
        aria-labelledby="transfer-confirmation-title"
      >
        <DialogTitle
          id="transfer-confirmation-title"
          sx={{ color: '#172033', fontWeight: 750 }}
        >
          {confirmationAction
            ? confirmationTitle[confirmationAction]
            : 'Confirm Action'}
        </DialogTitle>

        <DialogContent>
          <Typography sx={{ color: '#334155', lineHeight: 1.7 }}>
            {confirmationAction
              ? confirmationText[confirmationAction]
              : ''}
          </Typography>

          <Alert
            severity="warning"
            sx={{ mt: 2, borderRadius: 1.5, alignItems: 'flex-start' }}
          >
            This action updates the transfer in the current demo only.
          </Alert>
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={() => setConfirmationAction(null)}
            color="inherit"
          >
            Go Back
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            color={confirmationAction === 'reject' ? 'error' : 'primary'}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default TransferApproval