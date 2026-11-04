import { useMemo, useState } from 'react'
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { INITIAL_MOCK_USERS, userService } from '../api/userService'
import '../moduleStyles.css'

const roles = ['Officer-in-Charge', 'Security Officer', 'Prison Officer', 'Records Officer', 'Viewer']
const blankUser = { name: '', email: '', role: 'Security Officer', facility: 'Block A – Maximum' }

export default function UserAccess() {
  const [users, setUsers] = useState(INITIAL_MOCK_USERS)
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [draft, setDraft] = useState(blankUser)
  const [open, setOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const filteredUsers = useMemo(() => users.filter((user) => {
    const searchable = `${user.name} ${user.badgeId || user.email || ''} ${user.role} ${user.facility || ''}`.toLowerCase()
    return searchable.includes(query.toLowerCase()) && (roleFilter === 'All' || user.role === roleFilter)
  }), [users, query, roleFilter])
  const activeCount = users.filter((user) => String(user.status).toLowerCase() === 'active').length

  const updateRole = async (id, role) => {
    setUsers((items) => items.map((user) => user.id === id ? { ...user, role } : user))
    try { await userService.updateUserRole(id, role) } catch { /* Retain the local operational update in demo mode. */ }
  }
  const toggleStatus = (id) => setUsers((items) => items.map((user) => user.id === id ? { ...user, status: String(user.status).toLowerCase() === 'active' ? 'Suspended' : 'Active' } : user))
  const createUser = async () => {
    if (!draft.name.trim() || !draft.email.trim()) return
    const user = { ...draft, id: `USR-${Date.now()}`, badgeId: draft.email, status: 'Active' }
    setUsers((items) => [user, ...items]); setOpen(false); setDraft(blankUser); setNotice(`${user.name} has been added to the access directory.`)
    try { await userService.createUser(user) } catch { /* Local demo record remains available. */ }
  }

  return <Box className="module-workspace access-workspace">
    {notice && <Alert severity="success" onClose={() => setNotice('')} sx={{ mb: 2 }}>{notice}</Alert>}
    <Box className="module-heading"><Typography className="module-crumb">Administration / Access control</Typography><Box className="module-heading-row"><Box><Typography component="h1">Users & access</Typography><Typography>Review staff accounts, facility assignments, and system permissions.</Typography></Box><Button variant="contained" onClick={() => setOpen(true)}>Add user</Button></Box></Box>
    <Box className="module-metrics"><Metric label="Active accounts" value={activeCount} note="Enabled for system access" /><Metric label="Access roles" value={new Set(users.map((user) => user.role)).size} note="Configured permission groups" /></Box>
    <Paper className="module-filters" elevation={0}><TextField fullWidth placeholder="Search by officer, badge, role, or facility" value={query} onChange={(event) => setQuery(event.target.value)} /><Select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>{['All', ...roles].map((role) => <MenuItem key={role} value={role}>{role === 'All' ? 'All roles' : role}</MenuItem>)}</Select><Button onClick={() => { setQuery(''); setRoleFilter('All') }}>Clear</Button></Paper>
    <Paper className="module-directory" elevation={0}><Box className="module-directory-title"><Box><Typography component="h2">Access directory</Typography><Typography>{filteredUsers.length} matching account{filteredUsers.length === 1 ? '' : 's'}</Typography></Box></Box><TableContainer><Table><TableHead><TableRow><TableCell>Officer</TableCell><TableCell>Badge / email</TableCell><TableCell>Facility</TableCell><TableCell>Role</TableCell><TableCell>Status</TableCell><TableCell align="right">Action</TableCell></TableRow></TableHead><TableBody>{filteredUsers.map((user) => <TableRow key={user.id}><TableCell sx={{ fontWeight: 700 }}>{user.name}</TableCell><TableCell><code>{user.badgeId || user.email}</code></TableCell><TableCell>{user.facility || 'Unassigned'}</TableCell><TableCell><Select variant="standard" value={user.role} onChange={(event) => updateRole(user.id, event.target.value)}>{roles.map((role) => <MenuItem key={role} value={role}>{role}</MenuItem>)}</Select></TableCell><TableCell><Chip size="small" label={user.status} color={String(user.status).toLowerCase() === 'active' ? 'success' : 'warning'} /></TableCell><TableCell align="right"><Button size="small" onClick={() => toggleStatus(user.id)}>{String(user.status).toLowerCase() === 'active' ? 'Suspend' : 'Enable'}</Button></TableCell></TableRow>)}</TableBody></Table></TableContainer></Paper>
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm"><DialogTitle>Add system user</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}><Typography variant="body2" color="text.secondary">Create an account and assign the minimum access required for the officer’s duties.</Typography><TextField required label="Full name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /><TextField required type="email" label="Email address" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /><TextField select label="Role" value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })}>{roles.map((role) => <MenuItem key={role} value={role}>{role}</MenuItem>)}</TextField><TextField label="Facility assignment" value={draft.facility} onChange={(event) => setDraft({ ...draft, facility: event.target.value })} /></Stack></DialogContent><DialogActions><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="contained" onClick={createUser}>Create user</Button></DialogActions></Dialog>
  </Box>
}

function Metric({ label, value, note }) { return <Paper className="module-metric" elevation={0}><Typography>{label}</Typography><strong>{value}</strong><small>{note}</small></Paper> }
