import { AppBar, Box, Button, Chip, Drawer, List, ListItemButton, ListItemText, Toolbar } from '@mui/material'
import { InmateManagement } from '../features/inmates/InmateManagement'
import { AppIcon } from './AppIcon'

export function AppShell() {
  return <Box className="corp-shell">
    <AppBar className="corp-topbar" elevation={0} position="fixed"><Toolbar><Box sx={{ flexGrow: 1 }} /><Chip className="role-chip" label="Officer-in-Charge" size="small" /><Button className="account-button" aria-label="Account"><AppIcon name="account" /></Button></Toolbar></AppBar>
    <Drawer className="corp-sidebar" PaperProps={{ className: 'corp-sidebar-paper' }} variant="permanent"><Box className="brand"><Box className="brand-mark">⌂</Box></Box><List aria-label="Primary navigation"><ListItemButton className="corp-nav-item" selected><span className="nav-symbol"><AppIcon name="inmates" /></span><ListItemText primary="Inmate Management" /></ListItemButton></List></Drawer>
    <Box component="main" className="corp-main"><Toolbar /><InmateManagement canAdmit /></Box>
  </Box>
}
