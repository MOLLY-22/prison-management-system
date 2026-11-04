
import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
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

import type {
  Transfer,
  TransferAuditEntry,
} from '../../data/transferMockData'

interface TransferHistoryProps {
  entries: TransferAuditEntry[]
  transfers: Transfer[]
}

function TransferHistory({ entries, transfers }: TransferHistoryProps) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(5)

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase()

    const sortedEntries = [...entries].sort((a, b) => {
      // Newest audit entries appear first.
      return b.id - a.id
    })

    if (!query) return sortedEntries

    return sortedEntries.filter(entry => {
      const transfer = transfers.find(item => item.id === entry.transferId)

      const searchableText = [
        String(entry.transferId),
        entry.action,
        entry.performedBy,
        entry.date,
        entry.details,
        transfer?.inmateName ?? '',
        transfer?.inmateNumber ?? '',
        transfer?.originFacility ?? '',
        transfer?.destinationFacility ?? '',
        transfer?.status ?? '',
      ]
        .join(' ')
        .toLowerCase()

      return searchableText.includes(query)
    })
  }, [entries, transfers, search])

  const paginatedEntries = filteredEntries.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  )

  function getActionColor(
    action: string,
  ): 'success' | 'error' | 'warning' | 'info' | 'default' {
    const normalizedAction = action.toLowerCase()

    if (normalizedAction.includes('approved') ||
        normalizedAction.includes('completed')) {
      return 'success'
    }

    if (normalizedAction.includes('rejected') ||
        normalizedAction.includes('cancelled')) {
      return 'error'
    }

    if (normalizedAction.includes('requested')) {
      return 'warning'
    }

    if (normalizedAction.includes('transit')) {
      return 'info'
    }

    return 'default'
  }

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Transfer Audit History
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Search recorded transfer actions, the officers who performed them,
            and their dates and details.
          </Typography>
        </Box>

        <TextField
          label="Search audit history"
          placeholder="Search by inmate, transfer ID, officer, action, date..."
          value={search}
          onChange={event => {
            setSearch(event.target.value)
            setPage(0)
          }}
          fullWidth
          size="small"
        />

        <Typography variant="body2" color="text.secondary">
          Showing {filteredEntries.length} of {entries.length} audit entries
        </Typography>

        {filteredEntries.length === 0 ? (
          <Alert severity="info">
            {entries.length === 0
              ? 'No audit entries have been recorded yet.'
              : 'No audit entries match your search. Try another search term.'}
          </Alert>
        ) : (
          <>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" aria-label="Transfer audit history">
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <strong>Date and Time</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Transfer / Inmate</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Action</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Performed By</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Details</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {paginatedEntries.map(entry => {
                    const transfer = transfers.find(
                      item => item.id === entry.transferId,
                    )

                    return (
                      <TableRow key={entry.id} hover>
                        <TableCell sx={{ minWidth: 150, verticalAlign: 'top' }}>
                          {entry.date}
                        </TableCell>

                        <TableCell sx={{ minWidth: 180, verticalAlign: 'top' }}>
                          <Stack spacing={0.5}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {transfer?.inmateName ?? 'Unknown inmate'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {transfer?.inmateNumber ?? 'Inmate number unavailable'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Transfer ID: {entry.transferId}
                            </Typography>
                          </Stack>
                        </TableCell>

                        <TableCell sx={{ minWidth: 150, verticalAlign: 'top' }}>
                          <Chip
                            size="small"
                            label={entry.action}
                            color={getActionColor(entry.action)}
                            variant="outlined"
                          />
                        </TableCell>

                        <TableCell sx={{ minWidth: 140, verticalAlign: 'top' }}>
                          {entry.performedBy}
                        </TableCell>

                        <TableCell sx={{ minWidth: 240, verticalAlign: 'top' }}>
                          {entry.details}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={filteredEntries.length}
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

        <Alert severity="info">
          Demonstration only: audit entries are stored in frontend memory.
          They can be lost on refresh and are not tamper-proof. A production
          system should store audit records on the backend and restrict who can
          modify or view sensitive records.
        </Alert>
      </Stack>
    </Paper>
  )
}

export default TransferHistory
