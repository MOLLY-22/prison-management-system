
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

    const errorCount = Object.keys(nextErrors).length

    if (errorCount > 0) {
      setFormError(
        `Please correct ${errorCount} ${
          errorCount === 1 ? 'error' : 'errors'
        } before reviewing this transfer.`,
      )
      return false
    }

    setFormError('')
    return true
  }

  function handleReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!validateForm()) return

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
    setConfirmationOpen(false)
    setPendingTransfer(null)
  }

  const panelSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 1.5,
      backgroundColor: '#ffffff',
    },
    '& .MuiInputLabel-root': {
      color: '#475569',
    },
    '& .MuiFormHelperText-root': {
      fontSize: '0.75rem',
    },
  }

  return (
    <>
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, md: 3 },
          height: '100%',
          borderColor: '#e2e8f0',
          borderRadius: 2,
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        }}
      >
        <Stack spacing={2.5}>
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 750,
                color: '#172033',
                fontSize: '1.1rem',
              }}
            >
              Initiate Transfer Request
            </Typography>

            <Typography
              variant="body2"
              sx={{
                mt: 0.75,
                color: '#64748b',
                lineHeight: 1.6,
              }}
            >
              Enter the inmate details, destination facility and transport
              security level before submitting the request for review.
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
                xs: 'minmax(0, 1fr)',
                sm: 'repeat(2, minmax(0, 1fr))',
              },
              gap: 2,
              ...panelSx,
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
                mt: 0.5,
              }}
            >
              <Button
                type="submit"
                variant="contained"
                sx={{
                  px: 3,
                  py: 1.1,
                  borderRadius: 1.5,
                  backgroundColor: '#1d4ed8',
                  fontWeight: 700,
                  textTransform: 'none',
                  boxShadow: 'none',
                  '&:hover': {
                    backgroundColor: '#1e40af',
                    boxShadow: 'none',
                  },
                }}
              >
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
        <DialogTitle
          id="transfer-confirmation-title"
          sx={{ color: '#172033', fontWeight: 700 }}
        >
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

              <Typography sx={{ overflowWrap: 'anywhere' }}>
                <strong>Reason:</strong> {pendingTransfer.reason}
              </Typography>

              <Typography>
                <strong>Initial Status:</strong> Pending supervisory review
              </Typography>
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={handleConfirmationClose} color="inherit">
            Go Back
          </Button>

          <Button
            onClick={handleConfirm}
            variant="contained"
            disabled={!pendingTransfer}
            sx={{
              backgroundColor: '#1d4ed8',
              fontWeight: 700,
              textTransform: 'none',
              '&:hover': {
                backgroundColor: '#1e40af',
              },
            }}
          >
            Confirm and Submit
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default TransferForm
