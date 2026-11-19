import { Children, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import {
  createProgram,
  createProgramAttendance,
  createProgramEnrollment,
  errorMessage,
  fetchProgramAttendance,
  fetchProgramEnrollments,
  fetchPrograms,
  type ProgramAttendance,
  type ProgramEnrollment,
  type RehabilitationProgram,
} from './api'
import './programsManagement.css'

type ProgramForm = Omit<RehabilitationProgram, 'id'>
type EnrollmentForm = Pick<ProgramEnrollment, 'inmateId' | 'programId' | 'enrollmentDate'>
type AttendanceForm = Pick<
  ProgramAttendance,
  'inmateId' | 'programId' | 'sessionDate' | 'attendanceStatus' | 'remarks'
>

const today = new Date().toLocaleDateString('en-CA')
const emptyProgram: ProgramForm = {
  name: '',
  description: '',
  facilitator: '',
  startDate: '',
  endDate: '',
}
const emptyEnrollment: EnrollmentForm = {
  inmateId: '',
  programId: 0,
  enrollmentDate: today,
}
const emptyAttendance: AttendanceForm = {
  inmateId: '',
  programId: 0,
  sessionDate: today,
  attendanceStatus: 'present',
  remarks: '',
}

export default function ProgramsManagement() {
  const [programs, setPrograms] = useState<RehabilitationProgram[]>([])
  const [enrollments, setEnrollments] = useState<ProgramEnrollment[]>([])
  const [attendance, setAttendance] = useState<ProgramAttendance[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [programOpen, setProgramOpen] = useState(false)
  const [enrollmentOpen, setEnrollmentOpen] = useState(false)
  const [attendanceOpen, setAttendanceOpen] = useState(false)
  const [programForm, setProgramForm] = useState<ProgramForm>(emptyProgram)
  const [enrollmentForm, setEnrollmentForm] = useState<EnrollmentForm>(emptyEnrollment)
  const [attendanceForm, setAttendanceForm] = useState<AttendanceForm>(emptyAttendance)

  async function loadLists() {
    return Promise.all([
      fetchPrograms(),
      fetchProgramEnrollments(),
      fetchProgramAttendance(),
    ])
  }

  async function refreshLists() {
    setRefreshing(true)
    setLoadError(null)
    try {
      const [programRecords, enrollmentRecords, attendanceRecords] = await loadLists()
      setPrograms(programRecords)
      setEnrollments(enrollmentRecords)
      setAttendance(attendanceRecords)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    let active = true
    loadLists()
      .then(([programRecords, enrollmentRecords, attendanceRecords]) => {
        if (!active) return
        setPrograms(programRecords)
        setEnrollments(enrollmentRecords)
        setAttendance(attendanceRecords)
      })
      .catch((error: unknown) => {
        if (!active) return
        console.error('Loading rehabilitation program records failed:', error)
        setLoadError(errorMessage(error, 'Failed to load rehabilitation program records.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function refreshAfterSave() {
    try {
      await refreshLists()
    } catch (error) {
      console.error('Refreshing rehabilitation program records failed:', error)
      setLoadError(errorMessage(error, 'Saved successfully, but the lists could not be refreshed.'))
    }
  }

  async function saveProgram(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setSaveError(null)
    setNotice(null)
    try {
      await createProgram({
        ...programForm,
        name: programForm.name.trim(),
        description: programForm.description.trim(),
        facilitator: programForm.facilitator.trim(),
      })
      setProgramForm(emptyProgram)
      setProgramOpen(false)
      setNotice('Rehabilitation program created.')
      await refreshAfterSave()
    } catch (error) {
      console.error('Creating rehabilitation program failed:', error)
      setSaveError(errorMessage(error, 'Could not create the rehabilitation program.'))
    } finally {
      setSaving(false)
    }
  }

  async function saveEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setSaveError(null)
    setNotice(null)
    try {
      await createProgramEnrollment({
        ...enrollmentForm,
        inmateId: enrollmentForm.inmateId.trim(),
      })
      setEnrollmentForm({ ...emptyEnrollment, programId: 0 })
      setEnrollmentOpen(false)
      setNotice('Inmate enrollment recorded.')
      await refreshAfterSave()
    } catch (error) {
      console.error('Recording inmate enrollment failed:', error)
      setSaveError(errorMessage(error, 'Could not record the inmate enrollment.'))
    } finally {
      setSaving(false)
    }
  }

  async function saveAttendance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setSaveError(null)
    setNotice(null)
    try {
      await createProgramAttendance({
        ...attendanceForm,
        inmateId: attendanceForm.inmateId.trim(),
        remarks: attendanceForm.remarks.trim(),
      })
      setAttendanceForm({ ...emptyAttendance, programId: 0 })
      setAttendanceOpen(false)
      setNotice('Program attendance recorded.')
      await refreshAfterSave()
    } catch (error) {
      console.error('Recording program attendance failed:', error)
      setSaveError(errorMessage(error, 'Could not record program attendance.'))
    } finally {
      setSaving(false)
    }
  }

  const programName = (programId: number) =>
    programs.find((program) => program.id === programId)?.name ?? `Program ${programId}`

  return (
    <Box className="module-workspace programs-workspace">
      <Stack spacing={2.5}>
        <Box className="module-heading">
          <Typography className="module-crumb">Operations / Rehabilitation</Typography>
          <Box className="module-heading-row">
            <Box>
              <Typography component="h1">Rehabilitation Programs</Typography>
              <Typography>
                Manage programs, inmate enrollments, and session attendance.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Button variant="outlined" onClick={() => setEnrollmentOpen(true)}>
                Enroll inmate
              </Button>
              <Button variant="outlined" onClick={() => setAttendanceOpen(true)}>
                Record attendance
              </Button>
              <Button variant="contained" onClick={() => setProgramOpen(true)}>
                Create program
              </Button>
            </Stack>
          </Box>
        </Box>

        {notice && <Alert severity="success" onClose={() => setNotice(null)}>{notice}</Alert>}
        {loadError && <Alert severity="error" onClose={() => setLoadError(null)}>{loadError}</Alert>}
        {saveError && <Alert severity="error" onClose={() => setSaveError(null)}>{saveError}</Alert>}

        <Box className="module-metrics" sx={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          <Metric label="Active programs" value={programs.length} note="Available for enrollment" />
          <Metric label="Inmate enrollments" value={enrollments.length} note="Recorded program placements" />
          <Metric label="Attendance records" value={attendance.length} note="Sessions marked present or absent" />
        </Box>

        <RecordTable
          title="Rehabilitation programs"
          summary={`${programs.length} program${programs.length === 1 ? '' : 's'}`}
          headers={['Program', 'Facilitator', 'Program dates', 'Description']}
          loading={loading || refreshing}
          empty={loadError ? 'Programs could not be loaded.' : 'No rehabilitation programs have been created.'}
        >
          {programs.map((program) => (
            <TableRow key={program.id}>
              <TableCell>
                <Typography sx={{ fontWeight: 700 }}>{program.name}</Typography>
                <Typography variant="caption" color="text.secondary">ID: {program.id}</Typography>
              </TableCell>
              <TableCell>{program.facilitator || '—'}</TableCell>
              <TableCell>{[program.startDate, program.endDate].filter(Boolean).join(' – ') || '—'}</TableCell>
              <TableCell>{program.description || '—'}</TableCell>
            </TableRow>
          ))}
        </RecordTable>

        <RecordTable
          title="Inmate enrollments"
          summary={`${enrollments.length} enrollment${enrollments.length === 1 ? '' : 's'}`}
          headers={['Inmate ID', 'Program', 'Enrollment date']}
          loading={loading || refreshing}
          empty={loadError ? 'Enrollments could not be loaded.' : 'No inmates are enrolled yet.'}
        >
          {enrollments.map((enrollment) => (
            <TableRow key={enrollment.id}>
              <TableCell><code>{enrollment.inmateId}</code></TableCell>
              <TableCell>{enrollment.programName || programName(enrollment.programId)}</TableCell>
              <TableCell>{enrollment.enrollmentDate}</TableCell>
            </TableRow>
          ))}
        </RecordTable>

        <RecordTable
          title="Session attendance"
          summary={`${attendance.length} attendance record${attendance.length === 1 ? '' : 's'}`}
          headers={['Inmate ID', 'Program', 'Session date', 'Status', 'Remarks']}
          loading={loading || refreshing}
          empty={loadError ? 'Attendance could not be loaded.' : 'No attendance has been recorded.'}
        >
          {attendance.map((record) => (
            <TableRow key={record.id}>
              <TableCell><code>{record.inmateId}</code></TableCell>
              <TableCell>{record.programName || programName(record.programId)}</TableCell>
              <TableCell>{record.sessionDate}</TableCell>
              <TableCell>
                <Chip
                  size="small"
                  color={record.attendanceStatus === 'present' ? 'success' : 'default'}
                  label={record.attendanceStatus}
                />
              </TableCell>
              <TableCell>{record.remarks || '—'}</TableCell>
            </TableRow>
          ))}
        </RecordTable>
      </Stack>

      <Dialog open={programOpen} onClose={() => !saving && setProgramOpen(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={saveProgram}>
          <DialogTitle>Create rehabilitation program</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {saveError && <Alert severity="error">{saveError}</Alert>}
              <TextField
                required
                autoFocus
                label="Program name"
                value={programForm.name}
                onChange={(event) => setProgramForm({ ...programForm, name: event.target.value })}
              />
              <TextField
                multiline
                minRows={2}
                label="Description"
                value={programForm.description}
                onChange={(event) => setProgramForm({ ...programForm, description: event.target.value })}
              />
              <TextField
                label="Facilitator"
                value={programForm.facilitator}
                onChange={(event) => setProgramForm({ ...programForm, facilitator: event.target.value })}
              />
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 2 }}>
                <TextField
                  label="Start date"
                  type="date"
                  value={programForm.startDate}
                  onChange={(event) => setProgramForm({ ...programForm, startDate: event.target.value })}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  label="End date"
                  type="date"
                  value={programForm.endDate}
                  onChange={(event) => setProgramForm({ ...programForm, endDate: event.target.value })}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setProgramOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'Saving…' : 'Create program'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={enrollmentOpen} onClose={() => !saving && setEnrollmentOpen(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={saveEnrollment}>
          <DialogTitle>Enroll an inmate</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {saveError && <Alert severity="error">{saveError}</Alert>}
              <TextField
                required
                label="Inmate ID"
                placeholder="Enter the inmate's ID"
                value={enrollmentForm.inmateId}
                onChange={(event) => setEnrollmentForm({ ...enrollmentForm, inmateId: event.target.value })}
              />
              <ProgramSelect
                programs={programs}
                value={enrollmentForm.programId}
                onChange={(programId) => setEnrollmentForm({ ...enrollmentForm, programId })}
                label="Program"
              />
              <TextField
                required
                label="Enrollment date"
                type="date"
                value={enrollmentForm.enrollmentDate}
                onChange={(event) => setEnrollmentForm({ ...enrollmentForm, enrollmentDate: event.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEnrollmentOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving || programs.length === 0}>
              {saving ? 'Saving…' : 'Enroll inmate'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={attendanceOpen} onClose={() => !saving && setAttendanceOpen(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={saveAttendance}>
          <DialogTitle>Record session attendance</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {saveError && <Alert severity="error">{saveError}</Alert>}
              <TextField
                required
                label="Inmate ID"
                placeholder="Enter the inmate's ID"
                value={attendanceForm.inmateId}
                onChange={(event) => setAttendanceForm({ ...attendanceForm, inmateId: event.target.value })}
              />
              <ProgramSelect
                programs={programs}
                value={attendanceForm.programId}
                onChange={(programId) => setAttendanceForm({ ...attendanceForm, programId })}
                label="Program"
              />
              <TextField
                required
                label="Session date"
                type="date"
                value={attendanceForm.sessionDate}
                onChange={(event) => setAttendanceForm({ ...attendanceForm, sessionDate: event.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                select
                required
                label="Attendance status"
                value={attendanceForm.attendanceStatus}
                onChange={(event) => setAttendanceForm({
                  ...attendanceForm,
                  attendanceStatus: event.target.value as AttendanceForm['attendanceStatus'],
                })}
              >
                <MenuItem value="present">Present</MenuItem>
                <MenuItem value="absent">Absent</MenuItem>
              </TextField>
              <TextField
                multiline
                minRows={2}
                label="Remarks (optional)"
                value={attendanceForm.remarks}
                onChange={(event) => setAttendanceForm({ ...attendanceForm, remarks: event.target.value })}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAttendanceOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving || programs.length === 0}>
              {saving ? 'Saving…' : 'Save attendance'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  )
}

function ProgramSelect({
  programs,
  value,
  onChange,
  label,
}: {
  programs: RehabilitationProgram[]
  value: number
  onChange: (programId: number) => void
  label: string
}) {
  return (
    <TextField
      select
      required
      label={label}
      value={value || ''}
      onChange={(event) => onChange(Number(event.target.value))}
      disabled={programs.length === 0}
      helperText={programs.length === 0 ? 'Create a program before recording this entry.' : undefined}
    >
      {programs.map((program) => (
        <MenuItem key={program.id} value={program.id}>{program.name}</MenuItem>
      ))}
    </TextField>
  )
}

function RecordTable({
  title,
  summary,
  headers,
  loading,
  empty,
  children,
}: {
  title: string
  summary: string
  headers: string[]
  loading: boolean
  empty: string
  children: ReactNode
}) {
  return (
    <Paper className="module-directory" elevation={0}>
      <Box className="module-directory-title">
        <Typography component="h2">{title}</Typography>
        <Typography>{summary}</Typography>
      </Box>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>{headers.map((header) => <TableCell key={header}>{header}</TableCell>)}</TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={headers.length} align="center">
                  <CircularProgress size={24} aria-label={`Loading ${title.toLowerCase()}`} />
                </TableCell>
              </TableRow>
            ) : Children.count(children) > 0 ? (
              children
            ) : (
              <TableRow>
                <TableCell colSpan={headers.length} align="center">{empty}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  )
}

function Metric({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <Paper className="module-metric" elevation={0}>
      <Typography>{label}</Typography>
      <strong>{value.toLocaleString()}</strong>
      <Typography variant="body2">{note}</Typography>
    </Paper>
  )
}
