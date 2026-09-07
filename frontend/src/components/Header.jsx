import { AppBar, Box, Chip, IconButton, Stack, Tooltip, Typography, Toolbar } from '@mui/material'
import MenuRoundedIcon from '@mui/icons-material/MenuRounded'
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded'
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded'
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded'
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded'

export default function Header({ booklet, onBookletChange, dark, onThemeToggle, onOpenSettings, onOpenNav, papers = [], paperMeta }) {
  const index = papers.findIndex((p) => p.booklet_code === booklet)
  const nextBooklet = papers.length ? papers[(index + 1 + papers.length) % papers.length]?.booklet_code : booklet
  const label = paperMeta?.title || `${paperMeta?.exam || 'Question Paper'} • Set ${booklet}`
  return (
    <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', backdropFilter: 'blur(12px)' }}>
      <Toolbar sx={{ minHeight: { xs: 64, md: 72 }, gap: 1 }}>
        <IconButton onClick={onOpenNav} sx={{ display: { md: 'none' } }} aria-label="Open navigation"><MenuRoundedIcon /></IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" noWrap>Question Paper Navigator</Typography>
          <Typography variant="caption" color="text.secondary" noWrap>{label} • GitHub-backed • no SQL</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip size="small" label={`SET ${booklet}`} color="primary" variant="outlined" onClick={() => nextBooklet && onBookletChange(nextBooklet)} />
          <Tooltip title={dark ? 'Use light theme' : 'Use dark theme'}><IconButton onClick={onThemeToggle} aria-label="Toggle theme">{dark ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}</IconButton></Tooltip>
          <Tooltip title="Add / upload paper"><IconButton onClick={() => window.open('./admin-upload.html', '_blank', 'noopener,noreferrer')} aria-label="Open paper upload"><CloudUploadRoundedIcon /></IconButton></Tooltip>
          <Tooltip title="Settings"><IconButton onClick={onOpenSettings} aria-label="Open settings"><SettingsRoundedIcon /></IconButton></Tooltip>
        </Stack>
      </Toolbar>
    </AppBar>
  )
}
