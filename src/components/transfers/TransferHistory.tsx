
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

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => b.id - a.id),
    [entries],
  )

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase()

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
  }, [sortedEntries, transfers, search])

  const paginatedEntries = filteredEntries.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  )

  function getActionColor(
    action: string,
  ): 'success' | 'error' | 'warning' | 'info' | 'default' {
    const normalizedAction = action.toLowerCase()

    if (
      normalizedAction.includes('approved') ||
      normalizedAction.includes('completed')
    ) {
      return 'success'
    }

    if (
      normalizedAction.includes('rejected') ||
      normalizedAction.includes('cancelled')
    ) {
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
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, sm: 3 },
        minWidth: 0,
        borderColor: '#e2e8f0',
        borderRadius: 2,
        backgroundColor: '#ffffff',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
      }}
    >
      <Stack spacing={2.5}>
        <Box
          sx={{
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          <Box>
            <Typography
              variant="h6"
              component="h2"
              sx={{
                color: '#172033',
                fontWeight: 750,
                fontSize: '1.1rem',
              }}
            >
              Transfer Audit History
            </Typography>

            <Typography
              variant="body2"
              sx={{ mt: 0.5, color: '#64748b', lineHeight: 1.6 }}
            >
              Review recorded transfer actions, responsible officers, dates
              and details.
            </Typography>
          </Box>

          <Chip
            label={`${filteredEntries.length} entries`}
            size="small"
            sx={{
              backgroundColor: '#eff6ff',
              color: '#1d4ed8',
              fontWeight: 700,
            }}
          />
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              sm: 'minmax(0, 1fr) auto',
            },
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <TextField
            label="Search audit history"
            placeholder="Inmate, transfer ID, officer, action or date"
            value={search}
            onChange={event => {
              setSearch(event.target.value)
              setPage(0)
            }}
            fullWidth
            size="small"
            slotProps={{
              htmlInput: {
                'aria-label': 'Search transfer audit history',
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 1.5,
              },
            }}
          />

          <Typography
            variant="body2"
            sx={{
              color: '#64748b',
              whiteSpace: { xs: 'normal', sm: 'nowrap' },
            }}
          >
            {filteredEntries.length} of {entries.length} records
          </Typography>
        </Box>

        {filteredEntries.length === 0 ? (
          <Alert severity="info">
            {entries.length === 0
              ? 'No audit entries have been recorded yet.'
              : 'No audit entries match your search. Try another search term.'}
          </Alert>
        ) : (
          <>
            <TableContainer
              sx={{
                width: '100%',
                overflowX: 'auto',
                border: '1px solid #e2e8f0',
                borderRadius: 1.5,
              }}
            >
              <Table
                size="small"
                aria-label="Transfer audit history"
                sx={{ minWidth: 760 }}
              >
                <TableHead>
                  <TableRow
                    sx={{
                      backgroundColor: '#f1f5f9',
                      '& th': {
                        color: '#334155',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        borderColor: '#e2e8f0',
                        py: 1.5,
                      },
                    }}
                  >
                    <TableCell>Date and Time</TableCell>
                    <TableCell>Transfer / Inmate</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Performed By</TableCell>
                    <TableCell>Details</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {paginatedEntries.map(entry => {
                    const transfer = transfers.find(
                      item => item.id === entry.transferId,
                    )

                    return (
                      <TableRow
                        key={entry.id}
                        hover
                        sx={{
                          '& td': {
                            color: '#334155',
                            borderColor: '#e2e8f0',
                            py: 1.75,
                            verticalAlign: 'top',
                          },
                          '&:last-child td': {
                            borderBottom: 0,
                          },
                        }}
                      >
                        <TableCell
                          sx={{
                            minWidth: 155,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{ color: '#334155', fontWeight: 500 }}
                          >
                            {entry.date}
                          </Typography>
                        </TableCell>

                        <TableCell sx={{ minWidth: 185 }}>
                          <Stack spacing={0.5}>
                            <Typography
                              variant="body2"
                              sx={{
                                color: '#172033',
                                fontWeight: 700,
                              }}
                            >
                              {transfer?.inmateName ?? 'Unknown inmate'}
                            </Typography>

                            <Typography
                              variant="caption"
                              sx={{ color: '#64748b' }}
                            >
                              {transfer?.inmateNumber ??
                                'Inmate number unavailable'}
                            </Typography>

                            <Typography
                              variant="caption"
                              sx={{
                                color: '#1d4ed8',
                                fontWeight: 600,
                              }}
                            >
                              Transfer ID: {entry.transferId}
                            </Typography>
                          </Stack>
                        </TableCell>

                        <TableCell sx={{ minWidth: 150 }}>
                          <Chip
                            size="small"
                            label={entry.action}
                            color={getActionColor(entry.action)}
                            variant="outlined"
                            sx={{
                              fontWeight: 600,
                              borderRadius: 1,
                            }}
                          />
                        </TableCell>

                        <TableCell sx={{ minWidth: 145 }}>
                          <Typography
                            variant="body2"
                            sx={{ color: '#334155' }}
                          >
                            {entry.performedBy}
                          </Typography>
                        </TableCell>

                        <TableCell
                          sx={{
                            minWidth: 240,
                            maxWidth: 360,
                            overflowWrap: 'anywhere',
                            lineHeight: 1.6,
                          }}
                        >
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
              sx={{
                color: '#475569',
                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows':
                  {
                    fontSize: '0.8rem',
                  },
              }}
            />
          </>
        )}

        <Alert
          severity="info"
          sx={{
            borderRadius: 1.5,
            alignItems: 'flex-start',
            '& .MuiAlert-message': {
              lineHeight: 1.6,
            },
          }}
        >
          <Typography
            component="span"
            variant="body2"
            sx={{ fontWeight: 700 }}
          >
            Demo mode — audit limitations.
          </Typography>{' '}
          Audit entries are stored in frontend memory. They can be lost on
          refresh and are not tamper-proof. A production system should store
          audit records on the backend and restrict who can modify or view
          sensitive records.
        </Alert>
      </Stack>
    </Paper>
  )
}

export default TransferHistory
