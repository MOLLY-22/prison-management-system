
import { useState, type FormEvent } from 'react'
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

import type {
  SecurityLevel,
  Transfer,
} from '../../data/transferMockData'

interface TransferFormProps {
  onSubmit: (transfer: Transfer) => void
}

interface FormValues {
  inmateNumber: string
  inmateName: string
  originFacility: string
  destinationFacility: string
  securityLevel: SecurityLevel | ''
  reason: string
}

type FieldErrors = Partial<Record<keyof FormValues, string>>

const initialValues: FormValues = {
  inmateNumber: '',
  inmateName: '',
  originFacility: '',
  destinationFacility: '',
  securityLevel: '',
  reason: '',
}

function getLocalDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function TransferForm({ onSubmit }: TransferFormProps) {
  const [values, setValues] = useState<FormValues>(initialValues)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [pendingTransfer, setPendingTransfer] = useState<Transfer | null>(null)

  function handleChange(field: keyof FormValues, value: string) {
    setValues(current => ({
      ...current,
      [field]: value,
    }))

    // Remove this field's error as the user corrects it.
    setErrors(current => ({
      ...current,
      [field]: undefined,
    }))

    setFormError('')
  }

  function validateForm(): boolean {
    const nextErrors: FieldErrors = {}

    if (!values.inmateNumber.trim()) {
      nextErrors.inmateNumber = 'Inmate Number is required.'
    }

    if (!values.inmateName.trim()) {
      nextErrors.inmateName = 'Inmate Full Name is required.'
    }

    if (!values.originFacility.trim()) {
      nextErrors.originFacility = 'Origin Facility is required.'
    }

    if (!values.destinationFacility.trim()) {
      nextErrors.destinationFacility = 'Destination Facility is required.'
    }

    if (!values.securityLevel) {
      nextErrors.securityLevel = 'Please select a transport security level.'
    }

    if (!values.reason.trim()) {
      nextErrors.reason = 'Transfer Reason is required.'
    }

    if (
      values.originFacility.trim() &&
      values.destinationFacility.trim() &&
      values.originFacility.trim().toLowerCase() ===
        values.destinationFacility.trim().toLowerCase()
    ) {
      nextErrors.destinationFacility =
        'Destination must be different from the origin facility.'
    }

    setErrors(nextErrors)

    const hasErrors = Object.keys(nextErrors).length > 0

    if (hasErrors) {
      setFormError(
        `Please correct ${Object.keys(nextErrors).length} ${
          Object.keys(nextErrors).length === 1 ? 'error' : 'errors'
        } before reviewing this transfer.`,
      )
      return false
    }

    setFormError('')
    return true
  }

  function handleReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    // Validation guarantees the required values are present.
    const transfer: Transfer = {
      id: Date.now(),
      inmateNumber: values.inmateNumber.trim(),
      inmateName: values.inmateName.trim(),
      originFacility: values.originFacility.trim(),
      destinationFacility: values.destinationFacility.trim(),
      securityLevel: values.securityLevel as SecurityLevel,
      reason: values.reason.trim(),
      requestDate: getLocalDate(),
      status: 'Pending',
      requestedBy: 'Current User (Demo)',
      approvedBy: null,
      transitDate: null,
    }

    setPendingTransfer(transfer)
    setConfirmationOpen(true)
  }

  function handleConfirm() {
    if (!pendingTransfer) return

    onSubmit(pendingTransfer)

    setValues(initialValues)
    setErrors({})
    setFormError('')
    setPendingTransfer(null)
    setConfirmationOpen(false)
  }

  function handleConfirmationClose() {
    // Preserve form values if the user chooses to go back.
    setConfirmationOpen(false)
    setPendingTransfer(null)
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
              Complete all required fields before submitting a transfer for
              supervisory review.
            </Typography>
          </Box>

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
              label="Inmate Number"
              value={values.inmateNumber}
              onChange={event =>
                handleChange('inmateNumber', event.target.value)
              }
              error={Boolean(errors.inmateNumber)}
              helperText={errors.inmateNumber || ' '}
              required
              fullWidth
              slotProps={{ htmlInput: { maxLength: 30 } }}
            />

            <TextField
              label="Inmate Full Name"
              value={values.inmateName}
              onChange={event =>
                handleChange('inmateName', event.target.value)
              }
              error={Boolean(errors.inmateName)}
              helperText={errors.inmateName || ' '}
              required
              fullWidth
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />

            <TextField
              label="Origin Facility"
              value={values.originFacility}
              onChange={event =>
                handleChange('originFacility', event.target.value)
              }
              error={Boolean(errors.originFacility)}
              helperText={errors.originFacility || ' '}
              required
              fullWidth
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />

            <TextField
              label="Destination Facility"
              value={values.destinationFacility}
              onChange={event =>
                handleChange('destinationFacility', event.target.value)
              }
              error={Boolean(errors.destinationFacility)}
              helperText={errors.destinationFacility || ' '}
              required
              fullWidth
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />

            <TextField
              select
              label="Transport Security Level"
              value={values.securityLevel}
              onChange={event =>
                handleChange('securityLevel', event.target.value)
              }
              error={Boolean(errors.securityLevel)}
              helperText={errors.securityLevel || ' '}
              required
              fullWidth
            >
              <MenuItem value="Low">Low</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="High">High</MenuItem>
            </TextField>

            <TextField
              label="Transfer Reason"
              value={values.reason}
              onChange={event => handleChange('reason', event.target.value)}
              error={Boolean(errors.reason)}
              helperText={errors.reason || ' '}
              required
              fullWidth
              multiline
              minRows={2}
              slotProps={{ htmlInput: { maxLength: 500 } }}
              sx={{
                gridColumn: { xs: 'auto', sm: '1 / -1' },
              }}
            />

            <Box
              sx={{
                gridColumn: { xs: 'auto', sm: '1 / -1' },
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <Button type="submit" variant="contained">
                Review Transfer
              </Button>
            </Box>
          </Box>
        </Stack>
      </Paper>

      <Dialog
        open={confirmationOpen}
        onClose={handleConfirmationClose}
        fullWidth
        maxWidth="sm"
        aria-labelledby="transfer-confirmation-title"
      >
        <DialogTitle id="transfer-confirmation-title">
          Confirm Transfer Request
        </DialogTitle>

        <DialogContent dividers>
          {pendingTransfer && (
            <Stack spacing={1.5}>
              <Alert severity="warning">
                Please verify these details before submitting the request.
              </Alert>

              <Typography>
                <strong>Inmate:</strong> {pendingTransfer.inmateName}
              </Typography>

              <Typography>
                <strong>Inmate Number:</strong> {pendingTransfer.inmateNumber}
              </Typography>

              <Typography>
                <strong>Origin:</strong> {pendingTransfer.originFacility}
              </Typography>

              <Typography>
                <strong>Destination:</strong>{' '}
                {pendingTransfer.destinationFacility}
              </Typography>

              <Typography>
                <strong>Security Level:</strong> {pendingTransfer.securityLevel}
              </Typography>

              <Typography>
                <strong>Reason:</strong> {pendingTransfer.reason}
              </Typography>

              <Typography>
                <strong>Initial Status:</strong> Pending supervisory review
              </Typography>
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleConfirmationClose} color="inherit">
            Go Back
          </Button>

          <Button
            onClick={handleConfirm}
            variant="contained"
            disabled={!pendingTransfer}
          >
            Confirm and Submit
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default TransferForm
