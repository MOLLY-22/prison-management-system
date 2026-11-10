import { useMemo, useState, type ChangeEvent } from 'react'
import {
  Alert,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'

import type { TransferRecord } from './TransferTable'

interface TransferHistoryProps {
  transfers: TransferRecord[]
}

function formatDate(value?: string) {
  if (!value) return '—'

  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString()
}

function getStatusColor(
  status: TransferRecord['status'],
): 'success' | 'error' | 'warning' | 'info' | 'default' {
  switch (status) {
    case 'RECEIVED':
      return 'success'
    case 'REJECTED':
    case 'CANCELLED':
      return 'error'
    case 'PENDING':
      return 'warning'
    case 'APPROVED':
    case 'IN_TRANSIT':
      return 'info'
    default:
      return 'default'
  }
}

function TransferHistory({ transfers }: TransferHistoryProps) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(5)

  const filteredTransfers = useMemo(() => {
    const query = search.trim().toLowerCase()

    return [...transfers]
      .sort(
        (a, b) =>
          new Date(b.requestedAt).getTime() -
          new Date(a.requestedAt).getTime(),
      )
      .filter(transfer => {
        if (!query) return true

        return [
          transfer.id,
          transfer.inmateId,
          transfer.inmateName,
          transfer.sourcePrisonName,
          transfer.destinationPrisonName,
          transfer.status,
          transfer.reason ?? '',
        ]
          .join(' ')
          .toLowerCase()
          .includes(query)
      })
  }, [transfers, search])

  const paginatedTransfers = filteredTransfers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  )

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    setSearch(event.target.value)
    setPage(0)
  }

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
      <Stack spacing={2}>
        <Stack spacing={1}>
          <div>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Transfer Records
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Review submitted transfer requests and their current statuses.
            </Typography>
          </div>

          <Chip label={`${filteredTransfers.length} records`} variant="outlined" />
        </Stack>

        <TextField
          label="Search transfer records"
          placeholder="Search inmate, prison, transfer ID or status..."
          value={search}
          onChange={handleSearchChange}
          fullWidth
          size="small"
        />

        {filteredTransfers.length === 0 ? (
          <Alert severity="info">
            {transfers.length === 0
              ? 'No transfer records available.'
              : 'No records match your search.'}
          </Alert>
        ) : (
          <>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" aria-label="Transfer records">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Requested</strong></TableCell>
                    <TableCell><strong>Inmate</strong></TableCell>
                    <TableCell><strong>Transfer Route</strong></TableCell>
                    <TableCell><strong>Reason</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {paginatedTransfers.map(transfer => (
                    <TableRow key={transfer.id} hover>
                      <TableCell sx={{ minWidth: 150 }}>
                        {formatDate(transfer.requestedAt)}
                      </TableCell>

                      <TableCell sx={{ minWidth: 180 }}>
                        <Stack spacing={0.5}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {transfer.inmateName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {transfer.inmateId}
                          </Typography>
                        </Stack>
                      </TableCell>

                      <TableCell sx={{ minWidth: 220 }}>
                        {transfer.sourcePrisonName}
                        {' → '}
                        {transfer.destinationPrisonName}
                      </TableCell>

                      <TableCell sx={{ minWidth: 200 }}>
                        {transfer.reason || '—'}
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={transfer.status.replace('_', ' ')}
                          color={getStatusColor(transfer.status)}
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={filteredTransfers.length}
              page={page}
              onPageChange={(_, nextPage) => setPage(nextPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={event => {
                setRowsPerPage(Number(event.target.value))
                setPage(0)
              }}
              rowsPerPageOptions={[5, 10, 25]}
            />
          </>
        )}
      </Stack>
    </Paper>
  )
}

export default TransferHistory
