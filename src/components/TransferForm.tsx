import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

import { transferService } from '../api/transferService'

interface TransferRequest {
  inmateId: string
  destinationPrisonId: string
  reason: string
}

interface Inmate {
  id: string
  firstName: string
  lastName: string
  prisonId: string
  prisonName: string
}

interface Prison {
  id: string
  name: string
  active?: boolean
}

interface TransferFormProps {
  onSubmit: (request: TransferRequest) => Promise<void> | void
}

function extractItems<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]

  if (data && typeof data === 'object' && 'content' in data) {
    const content = (data as { content: unknown }).content
    return Array.isArray(content) ? (content as T[]) : []
  }

  return []
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'An unexpected error occurred.'
}

function TransferForm({ onSubmit }: TransferFormProps) {
  const [inmates, setInmates] = useState<Inmate[]>([])
  const [prisons, setPrisons] = useState<Prison[]>([])
  const [inmateId, setInmateId] = useState('')
  const [destinationPrisonId, setDestinationPrisonId] = useState('')
  const [reason, setReason] = useState('')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')
  const [reasonError, setReasonError] = useState('')

  useEffect(() => {
    let active = true

    async function loadOptions() {
      setLoading(true)
      setLoadError('')

      try {
        const [inmateData, prisonData] = await Promise.all([
          transferService.getInmates({ page: 0, size: 100 }),
          transferService.getPrisons({
            active: true,
            page: 0,
            size: 100,
          }),
        ])

        if (!active) return

        setInmates(extractItems<Inmate>(inmateData))
        setPrisons(extractItems<Prison>(prisonData))
      } catch (error) {
        if (active) setLoadError(getErrorMessage(error))
      } finally {
        if (active) setLoading(false)
      }
    }

    loadOptions()

    return () => {
      active = false
    }
  }, [])

  const selectedInmate = useMemo(
    () => inmates.find(inmate => inmate.id === inmateId),
    [inmates, inmateId],
  )

  const availablePrisons = useMemo(
    () => prisons.filter(prison => prison.id !== selectedInmate?.prisonId),
    [prisons, selectedInmate],
  )

  const selectedDestination = availablePrisons.find(
    prison => prison.id === destinationPrisonId,
  )

  function handleReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    setReasonError('')

    if (!inmateId) {
      setFormError('Please select an inmate.')
      return
    }

    if (!destinationPrisonId) {
      setFormError('Please select a destination prison.')
      return
    }

    if (destinationPrisonId === selectedInmate?.prisonId) {
      setFormError('The destination must differ from the inmate’s current prison.')
      return
    }

    if (!reason.trim()) {
      setReasonError('Transfer reason is required.')
      return
    }

    if (reason.trim().length > 2000) {
      setReasonError('Transfer reason cannot exceed 2000 characters.')
      return
    }

    setConfirmationOpen(true)
  }

  async function handleConfirm() {
    if (!inmateId || !destinationPrisonId || !reason.trim()) return

    setSubmitting(true)
    setFormError('')

    try {
      await onSubmit({
        inmateId,
        destinationPrisonId,
        reason: reason.trim(),
      })

      setInmateId('')
      setDestinationPrisonId('')
      setReason('')
      setConfirmationOpen(false)
    } catch (error) {
      setFormError(getErrorMessage(error))
      setConfirmationOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Create Transfer Request
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Select an inmate and destination prison, then provide the reason
              for the transfer.
            </Typography>
          </Box>

          {loadError && (
            <Alert severity="error">
              Could not load inmates and prisons: {loadError}
            </Alert>
          )}

          {formError && (
            <Alert severity="error" role="alert">
              {formError}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleReview}
            noValidate
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
              },
              gap: 2,
            }}
          >
            <TextField
              select
              label="Inmate"
              value={inmateId}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setInmateId(event.target.value)
                setDestinationPrisonId('')
                setFormError('')
              }}
              required
              fullWidth
              disabled={loading || inmates.length === 0}
              helperText={
                loading
                  ? 'Loading inmates...'
                  : inmates.length === 0
                    ? 'No inmates available.'
                    : 'Select the inmate to be transferred.'
              }
            >
              {inmates.map(inmate => (
                <MenuItem key={inmate.id} value={inmate.id}>
                  {inmate.firstName} {inmate.lastName}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Source Prison"
              value={selectedInmate?.prisonName ?? ''}
              fullWidth
              disabled
              helperText="Automatically determined from the selected inmate."
            />

            <TextField
              select
              label="Destination Prison"
              value={destinationPrisonId}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setDestinationPrisonId(event.target.value)
                setFormError('')
              }}
              required
              fullWidth
              disabled={!selectedInmate || loading}
              helperText={
                !selectedInmate
                  ? 'Select an inmate first.'
                  : availablePrisons.length === 0
                    ? 'No other active prisons available.'
                    : 'Select a different active prison.'
              }
            >
              {availablePrisons.map(prison => (
                <MenuItem key={prison.id} value={prison.id}>
                  {prison.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Transfer Reason"
              value={reason}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setReason(event.target.value)
                setReasonError('')
                setFormError('')
              }}
              error={Boolean(reasonError)}
              helperText={reasonError || `${reason.length}/2000 characters`}
              required
              fullWidth
              multiline
              minRows={3}
              slotProps={{ htmlInput: { maxLength: 2000 } }}
              sx={{ gridColumn: { xs: 'auto', sm: '1 / -1' } }}
            />

            <Box
              sx={{
                gridColumn: { xs: 'auto', sm: '1 / -1' },
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <Button
                type="submit"
                variant="contained"
                disabled={
                  loading ||
                  submitting ||
                  Boolean(loadError) ||
                  inmates.length === 0
                }
              >
                Review Transfer
              </Button>
            </Box>
          </Box>
        </Stack>
      </Paper>

      <Dialog
        open={confirmationOpen}
        onClose={() => !submitting && setConfirmationOpen(false)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="transfer-confirmation-title"
      >
        <DialogTitle id="transfer-confirmation-title">
          Confirm Transfer Request
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={1.5}>
            <Alert severity="warning">
              Verify these details before submitting the transfer request.
            </Alert>

            <Typography>
              <strong>Inmate:</strong>{' '}
              {selectedInmate
                ? `${selectedInmate.firstName} ${selectedInmate.lastName}`
                : ''}
            </Typography>

            <Typography>
              <strong>Source Prison:</strong>{' '}
              {selectedInmate?.prisonName ?? ''}
            </Typography>

            <Typography>
              <strong>Destination Prison:</strong>{' '}
              {selectedDestination?.name ?? ''}
            </Typography>

            <Typography>
              <strong>Reason:</strong> {reason}
            </Typography>

            <Typography>
              <strong>Initial Status:</strong> Pending
            </Typography>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setConfirmationOpen(false)}
            color="inherit"
            disabled={submitting}
          >
            Go Back
          </Button>

          <Button
            onClick={handleConfirm}
            variant="contained"
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Confirm and Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default TransferForm
