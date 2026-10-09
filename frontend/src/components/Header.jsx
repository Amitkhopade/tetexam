import { AppBar, Box, Chip, IconButton, Stack, Tooltip, Typography, Toolbar, Button } from '@mui/material'
import MenuRoundedIcon from '@mui/icons-material/MenuRounded'
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded'
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded'
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded'
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded'
import HomeRoundedIcon from '@mui/icons-material/HomeRounded'

export default function Header({ booklet, onBookletChange, dark, onThemeToggle, onOpenSettings, onOpenNav, papers = [], paperMeta, isAdmin = false, locked = false, onHome }) {
  const index = papers.findIndex((p) => p.booklet_code === booklet)
  const nextBooklet = papers.length ? papers[(index + 1 + papers.length) % papers.length]?.booklet_code : booklet
  const label = paperMeta?.title || `${paperMeta?.exam || 'Question Paper'} • Set ${booklet}`
  return (
    <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 0, bgcolor: 'background.default', backdropFilter: 'blur(12px)' }}>
      <Toolbar sx={{ minHeight: { xs: 64, md: 72 }, gap: 1 }}>
        <IconButton onClick={onOpenNav} sx={{ display: { md: 'none' } }} aria-label="Open navigation"><MenuRoundedIcon /></IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" noWrap>Question Paper Navigator</Typography>
          <Typography variant="caption" color="text.secondary" noWrap>{label} • GitHub-backed • no SQL</Typography>
        </Box>
        <Stack direction="row" spacing={0.6} alignItems="center">
          {onHome && <Tooltip title="Home"><IconButton onClick={onHome} aria-label="Home"><HomeRoundedIcon /></IconButton></Tooltip>}
          <Chip size="small" label={`SET ${booklet}`} color="primary" variant="outlined" onClick={() => !locked && nextBooklet && onBookletChange?.(nextBooklet)} sx={{ cursor: locked ? 'default' : 'pointer' }} />
          <Tooltip title={dark ? 'Use light theme' : 'Use dark theme'}><IconButton onClick={onThemeToggle} aria-label="Toggle theme">{dark ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}</IconButton></Tooltip>
          {isAdmin && <Tooltip title="Admin upload"><Button size="small" variant="outlined" startIcon={<CloudUploadRoundedIcon />} onClick={() => window.open('./admin-upload.html', '_blank', 'noopener,noreferrer')}>Admin</Button></Tooltip>}
          <Tooltip title="Settings"><IconButton onClick={onOpenSettings} aria-label="Open settings"><SettingsRoundedIcon /></IconButton></Tooltip>
        </Stack>
      </Toolbar>
    </AppBar>
  )
}
