
import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import type { SelectChangeEvent } from '@mui/material/Select'

import { transferService } from '../api/transferService'
import type { TransferRecord } from './TransferTable'
import type {
  ApproveTransferRequest,
  Page,
  TransferCell,
  TransferNoteRequest,
} from '../types/transfer'

interface TransferApprovalProps {
  transfer: TransferRecord | null
  onApprove: (
    transferId: string,
    approvalData: ApproveTransferRequest,
  ) => Promise<void> | void
  onReject: (
    transferId: string,
    data?: TransferNoteRequest,
  ) => Promise<void> | void
  onCancel: (
    transferId: string,
    data?: TransferNoteRequest,
  ) => Promise<void> | void
  onClose: () => void
}

async function loadAllCells(
  fetchPage: (page: number) => Promise<Page<TransferCell>>,
): Promise<TransferCell[]> {
  const firstPage = await fetchPage(0)
  const remainingPages = await Promise.all(
    Array.from({ length: Math.max(0, firstPage.totalPages - 1) }, (_, index) =>
      fetchPage(index + 1),
    ),
  )
  return [firstPage, ...remainingPages].flatMap(page => page.content)
}

function formatDate(value?: string) {
  if (!value) return '—'

  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString()
}

function TransferApproval({
  transfer,
  onApprove,
  onReject,
  onCancel,
  onClose,
}: TransferApprovalProps) {
  const [cells, setCells] = useState<TransferCell[]>([])
  const [selectedCellId, setSelectedCellId] = useState('')
  const [note, setNote] = useState('')
  const [loadingCells, setLoadingCells] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [confirmationAction, setConfirmationAction] =
    useState<'approve' | 'reject' | 'cancel' | null>(null)

  useEffect(() => {
    let active = true

    async function loadCells() {
      if (!transfer?.destinationPrisonId) {
        setCells([])
        return
      }

      setLoadingCells(true)
      setError('')
      setSelectedCellId('')

      try {
        const availableCells = await loadAllCells(page =>
          transferService.getCells({
            prisonId: transfer.destinationPrisonId,
            page,
            size: 100,
          }),
        )

        if (active) {
          setCells(
            availableCells.filter(cell => cell.availableSpaces > 0),
          )
        }
      } catch {
        if (active) {
          setError('Could not load available cells at the destination prison.')
        }
      } finally {
        if (active) {
          setLoadingCells(false)
        }
      }
    }

    if (transfer) {
      loadCells()
    }

    return () => {
      active = false
    }
  }, [transfer])

  function handleCellChange(event: SelectChangeEvent) {
    setSelectedCellId(event.target.value)
  }

  async function handleConfirm() {
    if (!transfer || !confirmationAction) return

    setSubmitting(true)
    setError('')

    try {
      if (confirmationAction === 'approve') {
        if (!selectedCellId) {
          setError('Select an available destination cell.')
          return
        }

        await onApprove(transfer.id, {
          cellId: selectedCellId,
          note: note.trim() || undefined,
        })
      } else if (confirmationAction === 'reject') {
        await onReject(transfer.id, {
          note: note.trim() || undefined,
        })
      } else {
        await onCancel(transfer.id, {
          note: note.trim() || undefined,
        })
      }

      setConfirmationAction(null)
      onClose()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'The transfer action could not be completed.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    if (submitting) return

    setConfirmationAction(null)
    setError('')
    onClose()
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
                severity={transfer.status === 'PENDING' ? 'warning' : 'info'}
              >
                <strong>Status: {transfer.status}</strong>
                <br />
                {transfer.status === 'PENDING'
                  ? 'This transfer request is awaiting a decision.'
                  : 'This transfer is not awaiting initial approval.'}
              </Alert>

              {error && <Alert severity="error">{error}</Alert>}

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={1}>
                  <Typography>
                    <strong>Inmate:</strong> {transfer.inmateName}
                  </Typography>

                  <Typography>
                    <strong>Inmate ID:</strong> {transfer.inmateId}
                  </Typography>

                  <Typography>
                    <strong>Origin:</strong> {transfer.sourcePrisonName}
                  </Typography>

                  <Typography>
                    <strong>Destination:</strong>{' '}
                    {transfer.destinationPrisonName}
                  </Typography>

                  <Typography>
                    <strong>Reason:</strong> {transfer.reason || '—'}
                  </Typography>

                  <Typography>
                    <strong>Requested:</strong>{' '}
                    {formatDate(transfer.requestedAt)}
                  </Typography>
                  {transfer.requestedBy && (
                    <Typography>
                      <strong>Requested by:</strong> {transfer.requestedBy}
                    </Typography>
                  )}
                  {transfer.decisionNote && (
                    <Typography>
                      <strong>Decision note:</strong> {transfer.decisionNote}
                    </Typography>
                  )}
                </Stack>
              </Paper>

              {transfer.status === 'PENDING' && (
                <>
                  <FormControl fullWidth>
                    <InputLabel id="destination-cell-label">
                      Destination Cell
                    </InputLabel>

                    <Select
                      labelId="destination-cell-label"
                      value={selectedCellId}
                      label="Destination Cell"
                      onChange={handleCellChange}
                      disabled={loadingCells || submitting}
                    >
                      {cells.map(cell => (
                        <MenuItem key={cell.id} value={cell.id}>
                          {cell.name || cell.cellNumber || cell.id}
                          {' — '}
                          {cell.availableSpaces} spaces available
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {!loadingCells && cells.length === 0 && (
                    <Alert severity="warning">
                      No available cells were found at the destination prison.
                      Approval cannot proceed.
                    </Alert>
                  )}

                  {loadingCells && (
                    <Alert severity="info">Loading destination cells...</Alert>
                  )}

                  <TextField
                    label="Decision Note"
                    value={note}
                    onChange={event => setNote(event.target.value)}
                    multiline
                    minRows={2}
                    fullWidth
                    slotProps={{
                      htmlInput: { maxLength: 2000 },
                    }}
                    disabled={submitting}
                  />
                </>
              )}
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={handleClose} color="inherit" disabled={submitting}>
            Close
          </Button>

          {transfer?.status === 'PENDING' && (
            <>
              <Button
                color="error"
                variant="outlined"
                onClick={() => {
                  setError('')
                  setConfirmationAction('reject')
                }}
                disabled={submitting}
              >
                Reject
              </Button>

              <Button
                color="inherit"
                variant="outlined"
                onClick={() => {
                  setError('')
                  setConfirmationAction('cancel')
                }}
                disabled={submitting}
              >
                Cancel Request
              </Button>

              <Button
                variant="contained"
                onClick={() => {
                  setError('')
                  setConfirmationAction('approve')
                }}
                disabled={
                  submitting || loadingCells || cells.length === 0 || !selectedCellId
                }
              >
                Approve
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmationAction !== null}
        onClose={() => !submitting && setConfirmationAction(null)}
        aria-labelledby="transfer-confirmation-title"
      >
        <DialogTitle id="transfer-confirmation-title">
          {confirmationAction === 'approve'
            ? 'Confirm Transfer Approval'
            : confirmationAction === 'reject'
              ? 'Confirm Transfer Rejection'
              : 'Confirm Transfer Cancellation'}
        </DialogTitle>

        <DialogContent>
          <Typography>
            {confirmationAction === 'approve'
              ? `Approve the transfer for ${transfer?.inmateName} and assign the selected destination cell?`
              : confirmationAction === 'reject'
                ? `Reject the transfer request for ${transfer?.inmateName}?`
                : `Cancel the transfer request for ${transfer?.inmateName}?`}
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => setConfirmationAction(null)}
            color="inherit"
            disabled={submitting}
          >
            Go Back
          </Button>

          <Button
            onClick={handleConfirm}
            variant="contained"
            color={confirmationAction === 'approve' ? 'primary' : 'error'}
            disabled={submitting}
          >
            {submitting ? 'Processing...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default TransferApproval
