import { Box, Chip, Divider, Drawer, IconButton, List, ListItemButton, ListItemText, Stack, TextField, Tooltip, Typography } from '@mui/material'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded'

const DRAWER = 300

export default function Sidebar({ open, onClose, questions, currentIndex, onSelect, booklet, language, onLanguageChange, availableLanguages = ['en', 'hi'], search, onSearch, answerCount, reviewCount }) {
  const body = (
    <Box sx={{ width: DRAWER, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" px={2} py={1.5}>
        <Stack direction="row" gap={1} alignItems="center">
          <MenuBookRoundedIcon color="primary" />
          <Typography fontWeight={800}>Question map</Typography>
        </Stack>
        <IconButton onClick={onClose} sx={{ display: { md: 'none' } }}><CloseRoundedIcon /></IconButton>
      </Stack>
      <Box px={2} pb={1.5}>
        <Stack direction="row" spacing={1} mb={1}>
          {availableLanguages.includes('en') && <Chip label="English" size="small" color={language === 'en' ? 'primary' : 'default'} onClick={() => onLanguageChange('en')} />}
          {availableLanguages.includes('hi') && <Chip label="हिन्दी" size="small" color={language === 'hi' ? 'primary' : 'default'} onClick={() => onLanguageChange('hi')} />}
        </Stack>
        <Stack direction="row" gap={1}>
          <Chip size="small" label={`Answered ${answerCount}/${questions.length}`} />
          <Chip size="small" label={`Review ${reviewCount}`} color={reviewCount ? 'warning' : 'default'} />
        </Stack>
      </Box>
      <Divider />
      <Box sx={{ px: 1.25, py: 1 }}>
        <TextField fullWidth size="small" value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search question text" InputProps={{ startAdornment: <SearchRoundedIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} /> }} />
      </Box>
      <List dense sx={{ overflowY: 'auto', px: 1, pb: 2 }}>
        {questions.map((q, index) => {
          const match = !search || q.question_text.toLowerCase().includes(search.toLowerCase())
          if (!match) return null
          return (
            <ListItemButton key={q.id} selected={index === currentIndex} onClick={() => { onSelect(index); onClose() }} sx={{ borderRadius: 2, mb: 0.25 }}>
              <ListItemText primary={`Q${q.question_number}`} secondary={q.part_name} primaryTypographyProps={{ fontWeight: 800 }} secondaryTypographyProps={{ noWrap: true }} />
              <Tooltip title={q.extraction?.status || 'unknown'}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: q.extraction?.status === 'review' ? 'warning.main' : 'success.main' }} /></Tooltip>
            </ListItemButton>
          )
        })}
      </List>
    </Box>
  )
  return (
    <><Drawer variant="temporary" open={open} onClose={onClose} ModalProps={{ keepMounted: true }} sx={{ display: { md: 'none' } }}>{body}</Drawer>
      <Drawer variant="permanent" open sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: DRAWER, boxSizing: 'border-box', top: 72, height: 'calc(100% - 72px)', borderRight: 1, borderColor: 'divider', bgcolor: 'background.paper' } }}>{body}</Drawer></>
  )
}
