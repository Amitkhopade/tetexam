import { AppBar, Avatar, Box, Button, Chip, Container, Stack, Toolbar, Tooltip, Typography } from '@mui/material'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded'
import HomeRoundedIcon from '@mui/icons-material/HomeRounded'
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded'

export default function SiteHeader({ session, tab, onTabChange, onLogout }) {
  const isAdmin = session?.role === 'admin'
  const tabs = [
    { id: 'home', label: 'Home', icon: <HomeRoundedIcon fontSize="small" /> },
    { id: 'exams', label: 'Question Papers', icon: <MenuBookRoundedIcon fontSize="small" /> },
    { id: 'instructions', label: 'Instructions' },
    { id: 'about', label: 'About' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'profile', label: 'My Account' },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: <AdminPanelSettingsRoundedIcon fontSize="small" /> }] : []),
  ]
  return (
    <AppBar position="sticky" color="inherit" elevation={0} sx={{ bgcolor: 'background.default', borderBottom: 0 }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ minHeight: { xs: 70, md: 82 }, gap: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={1.2} sx={{ flex: 1, minWidth: 0 }}>
            <Avatar sx={{ width: 42, height: 42, bgcolor: 'primary.main', boxShadow: 'inset 2px 2px 5px rgba(255,255,255,.35), 4px 6px 12px rgba(37,99,235,.22)' }}>
              <MenuBookRoundedIcon />
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={900} noWrap>Question Paper Navigator</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>Assessment workspace</Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={0.5} sx={{ display: { xs: 'none', lg: 'flex' }, overflowX: 'auto' }}>
            {tabs.map((item) => <Button key={item.id} onClick={() => onTabChange(item.id)} startIcon={item.icon} variant={tab === item.id ? 'contained' : 'text'} size="small">{item.label}</Button>)}
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title={session?.displayName || session?.username || 'User'}>
              <Chip size="small" label={isAdmin ? 'ADMIN' : session?.displayName || session?.username || 'USER'} />
            </Tooltip>
            <Button size="small" variant="outlined" onClick={onLogout} startIcon={<LogoutRoundedIcon />}>Logout</Button>
          </Stack>
        </Toolbar>
        <Stack direction="row" spacing={0.5} sx={{ pb: 1.2, display: { xs: 'flex', lg: 'none' }, overflowX: 'auto' }}>
          {tabs.map((item) => <Button key={item.id} onClick={() => onTabChange(item.id)} startIcon={item.icon} variant={tab === item.id ? 'contained' : 'text'} size="small" sx={{ whiteSpace: 'nowrap' }}>{item.label}</Button>)}
        </Stack>
      </Container>
    </AppBar>
  )
}
