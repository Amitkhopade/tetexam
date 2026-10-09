import { Chip, Stack, Typography } from '@mui/material'
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded'
import { formatDuration } from '../lib/examSession'

export default function TimerBar({ remaining }) {
  const urgent = remaining <= 10 * 60 * 1000
  return <Stack direction="row" alignItems="center" spacing={1}>
    <Typography variant="caption" color="text.secondary">TIME LEFT</Typography>
    <Chip color={urgent ? 'error' : 'primary'} icon={<AccessTimeRoundedIcon />} label={formatDuration(remaining)} sx={{ fontWeight: 900, minWidth: 118 }} />
  </Stack>
}
