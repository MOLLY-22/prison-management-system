import { useEffect, useState, type ChangeEvent } from 'react'
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

import { transferService } from '../api/transferService'
import type { TransferRecord } from '../components/transfers/TransferTable'

interface TransferCell {
  id: string
  name: string
  cellNumber: string
  blockName: string
  capacity: number
  currentOccupancy: number
  availableSpaces: number
}

interface TransferApprovalProps {
  transfer: TransferRecord | null
  onApprove: (
    transferId: string,
    data: { cellId: string; note?: string },
  ) => Promise<void> | void
  onReject: (
    transferId: string,
    data?: { note?: string },
  ) => Promise<void> | void
  onClose: () => void
}

function extractCells(response: unknown): TransferCell[] {
  let items: unknown[] = []

  if (Array.isArray(response)) {
    items = response
  } else if (
    response &&
    typeof response === 'object' &&
    'content' in response &&
    Array.isArray(response.content)
  ) {
    items = response.content
  }

  return items
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === 'object',
    )
    .map(item => {
      const capacity = Number(item.capacity ?? 0)
      const currentOccupancy = Number(item.currentOccupancy ?? 0)

      return {
        id: String(item.id ?? ''),
        name: String(item.name ?? ''),
        cellNumber: String(item.cellNumber ?? ''),
        blockName: String(item.blockName ?? ''),
        capacity,
        currentOccupancy,
        availableSpaces:
          item.availableSpaces !== undefined
            ? Number(item.availableSpaces)
            : Math.max(0, capacity - currentOccupancy),
      }
    })
    .filter(cell => cell.id && cell.availableSpaces > 0)
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message

  return 'Something went wrong. Please try again.'
}

function TransferApproval({
  transfer,
  onApprove,
  onReject,
  onClose,
}: TransferApprovalProps) {
  const [cells, setCells] = useState<TransferCell[]>([])
  const [selectedCellId, setSelectedCellId] = useState('')
  const [note, setNote] = useState('')
  const [loadingCells, setLoadingCells] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const isOpen = Boolean(transfer)
  const isPending = transfer?.status === 'PENDING'

  useEffect(() => {
    if (!transfer || !isPending) {
      setCells([])
      setSelectedCellId('')
      return
    }

    const destinationPrisonId = transfer.destinationPrisonId
    let active = true

    async function loadCells() {
      setLoadingCells(true)
      setErrorMessage('')
      setSelectedCellId('')

      try {
        const response = await transferService.getCells({
          prisonId: destinationPrisonId,
          page: 0,
          size: 100,
        })

        if (active) {
          setCells(extractCells(response))
        }
      } catch (error) {
        if (active) {
          setErrorMessage(getErrorMessage(error))
        }
      } finally {
        if (active) {
          setLoadingCells(false)
        }
      }
    }

    loadCells()

    return () => {
      active = false
    }
  }, [transfer, isPending])

  async function handleApprove() {
    if (!transfer || !selectedCellId) return

    setSubmitting(true)
    setErrorMessage('')

    try {
      await onApprove(transfer.id, {
        cellId: selectedCellId,
        ...(note.trim() ? { note: note.trim() } : {}),
      })

      setNote('')
      onClose()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReject() {
    if (!transfer) return

    setSubmitting(true)
    setErrorMessage('')

    try {
      await onReject(
        transfer.id,
        note.trim() ? { note: note.trim() } : {},
      )

      setNote('')
      onClose()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    if (submitting) return

    setNote('')
    setErrorMessage('')
    onClose()
  }

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
    >
      {transfer && (
        <>
          <DialogTitle sx={{ fontWeight: 700 }}>
            Transfer Request Details
          </DialogTitle>

          <DialogContent dividers>
            <Stack spacing={2}>
              <Stack spacing={0.5}>
                <Typography variant="body2" color="text.secondary">
                  Inmate
                </Typography>
                <Typography sx={{ fontWeight: 600 }}>
                  {transfer.inmateName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ID: {transfer.inmateId}
                </Typography>
              </Stack>

              <Stack spacing={0.5}>
                <Typography variant="body2" color="text.secondary">
                  Transfer route
                </Typography>
                <Typography>
                  {transfer.sourcePrisonName} →{' '}
                  {transfer.destinationPrisonName}
                </Typography>
              </Stack>

              <Stack spacing={0.5}>
                <Typography variant="body2" color="text.secondary">
                  Reason for transfer
                </Typography>
                <Typography>
                  {transfer.reason || 'No reason provided.'}
                </Typography>
              </Stack>

              <Stack spacing={0.5}>
                <Typography variant="body2" color="text.secondary">
                  Current status
                </Typography>
                <Typography sx={{ fontWeight: 600 }}>
                  {transfer.status.replace('_', ' ')}
                </Typography>
              </Stack>

              {errorMessage && (
                <Alert severity="error">
                  {errorMessage}
                </Alert>
              )}

              {isPending ? (
                <>
                  {loadingCells ? (
                    <Stack spacing={1}>
                      <CircularProgress size={20} />
                      <Typography variant="body2">
                        Loading available cells...
                      </Typography>
                    </Stack>
                  ) : (
                    <TextField
                      select
                      fullWidth
                      label="Destination cell"
                      value={selectedCellId}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setSelectedCellId(event.target.value)
                      }
                      disabled={cells.length === 0}
                      helperText={
                        cells.length === 0
                          ? 'No available cells were found at the destination prison.'
                          : 'Select a cell with available capacity.'
                      }
                    >
                      {cells.map(cell => (
                        <MenuItem key={cell.id} value={cell.id}>
                          {cell.blockName
                            ? `${cell.blockName} - `
                            : ''}
                          {cell.name || cell.cellNumber}
                          {' '}({cell.availableSpaces} spaces available)
                        </MenuItem>
                      ))}
                    </TextField>
                  )}

                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    label="Decision note (optional)"
                    value={note}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setNote(event.target.value)
                    }
                    slotProps={{
                      htmlInput: { maxLength: 2000 },
                    }}
                    helperText={`${note.length}/2000 characters`}
                  />
                </>
              ) : (
                <Alert severity="info">
                  This transfer is no longer pending, so no approval or
                  rejection action is available.
                </Alert>
              )}
            </Stack>
          </DialogContent>

          <DialogActions sx={{ p: 2 }}>
            <Button
              onClick={handleClose}
              disabled={submitting}
              color="inherit"
            >
              Close
            </Button>

            {isPending && (
              <>
                <Button
                  onClick={handleReject}
                  color="error"
                  disabled={submitting}
                >
                  Reject
                </Button>

                <Button
                  onClick={handleApprove}
                  variant="contained"
                  disabled={
                    submitting ||
                    loadingCells ||
                    !selectedCellId
                  }
                >
                  {submitting ? 'Processing...' : 'Approve'}
                </Button>
              </>
            )}
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}

export default TransferApproval