import { Box, Button, Card, CardContent, Chip, Container, Divider, Grid, Stack, Typography } from '@mui/material'
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded'
import HomeRoundedIcon from '@mui/icons-material/HomeRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded'

export default function ResultPage({ paperMeta, result, onRetake, onHome }) {
  const percentage = result.total ? Math.round((result.correct / result.total) * 100) : 0
  return <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
    <Stack spacing={2.2}>
      <Card>
        <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
          <Stack spacing={2.2} alignItems="center" textAlign="center">
            <Box sx={{ width: 76, height: 76, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: 'success.light', color: 'success.dark', boxShadow: '6px 6px 14px rgba(80,120,80,.18), -6px -6px 14px rgba(255,255,255,.9)' }}>
              <CheckCircleRoundedIcon sx={{ fontSize: 42 }} />
            </Box>
            <Typography variant="h4">Exam completed</Typography>
            <Typography color="text.secondary">{paperMeta.title || `Set ${paperMeta.booklet_code}`}</Typography>
            <Typography sx={{ fontSize: 56, fontWeight: 900, lineHeight: 1 }}>{result.correct}<Typography component="span" sx={{ fontSize: 28, fontWeight: 700, color: 'text.secondary' }}> / {result.total}</Typography></Typography>
            <Chip color={percentage >= 70 ? 'success' : percentage >= 40 ? 'warning' : 'error'} label={`${percentage}% correct`} />
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 6, sm: 3 }}><Stat label="Correct" value={result.correct} /></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><Stat label="Attempted" value={result.attempted} /></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><Stat label="Unanswered" value={Math.max(0, result.total - result.attempted)} /></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><Stat label="Scored" value={result.scorable} /></Grid>
          </Grid>
          {result.unscored > 0 && <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="warning.main">{result.unscored} question(s) did not have a usable answer in the loaded answer key and were excluded from scoring.</Typography>
          </>}
        </CardContent>
      </Card>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
        <Button variant="contained" startIcon={<ReplayRoundedIcon />} onClick={onRetake} fullWidth>Retake Exam</Button>
        <Button variant="outlined" startIcon={<HomeRoundedIcon />} onClick={onHome} fullWidth>Back to Home</Button>
      </Stack>
    </Stack>
  </Container>
}

function Stat({ label, value }) {
  return <Box sx={{ p: 1.5, borderRadius: 3, textAlign: 'center', bgcolor: 'background.default', boxShadow: 'inset 3px 3px 8px rgba(151,165,180,.18), inset -3px -3px 8px rgba(255,255,255,.7)' }}>
    <Typography variant="h5" fontWeight={900}>{value}</Typography>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
  </Box>
}
