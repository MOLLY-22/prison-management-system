
import { useState } from 'react'
import {
  Alert,
  Button,
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
    Pending: 'This request is waiting for a supervisor to approve or reject it.',
    Approved: 'This transfer has been authorized. Mark it In Transit when the movement actually begins.',
    'In Transit': 'The inmate is being transported. Mark the transfer Completed only after arrival has been recorded.',
    Completed: 'This transfer has been completed. Its status is read-only.',
    Rejected: 'A supervisor rejected this request. It cannot proceed to transport.',
    Cancelled: 'This request was cancelled or withdrawn. It cannot proceed to transport.',
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
        <DialogTitle id="transfer-review-title">
          Review Transfer
        </DialogTitle>

        <DialogContent dividers>
          {transfer && (
            <Stack spacing={2}>
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
              >
                <strong>Status: {transfer.status}</strong>
                <br />
                {statusDescription[transfer.status]}
              </Alert>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={1}>
                  <Typography>
                    <strong>Inmate:</strong> {transfer.inmateName}
                  </Typography>
                  <Typography>
                    <strong>Inmate Number:</strong> {transfer.inmateNumber}
                  </Typography>
                  <Typography>
                    <strong>Origin:</strong> {transfer.originFacility}
                  </Typography>
                  <Typography>
                    <strong>Destination:</strong> {transfer.destinationFacility}
                  </Typography>
                  <Typography>
                    <strong>Security Level:</strong> {transfer.securityLevel}
                  </Typography>
                  <Typography>
                    <strong>Reason:</strong> {transfer.reason}
                  </Typography>
                  <Typography>
                    <strong>Requested By:</strong> {transfer.requestedBy}
                  </Typography>
                  <Typography>
                    <strong>Request Date:</strong> {transfer.requestDate}
                  </Typography>
                  <Typography>
                    <strong>Approved By:</strong> {transfer.approvedBy ?? 'Not approved'}
                  </Typography>
                  <Typography>
                    <strong>Transit Date:</strong> {transfer.transitDate ?? 'Not started'}
                  </Typography>
                </Stack>
              </Paper>
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, flexWrap: 'wrap', gap: 1 }}>
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
              >
                Approve
              </Button>
            </>
          )}

          {transfer?.status === 'Approved' && (
            <Button
              variant="contained"
              onClick={() => setConfirmationAction('in-transit')}
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
        aria-labelledby="transfer-confirmation-title"
      >
        <DialogTitle id="transfer-confirmation-title">
          {confirmationAction ? confirmationTitle[confirmationAction] : 'Confirm Action'}
        </DialogTitle>

        <DialogContent>
          <Typography>
            {confirmationAction ? confirmationText[confirmationAction] : ''}
          </Typography>

          <Alert severity="warning" sx={{ mt: 2 }}>
            This action updates the transfer in the current demo only.
          </Alert>
        </DialogContent>

        <DialogActions>
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
