import { Alert, Box, Button, Card, Chip, Divider, Grid, Radio, Stack, Typography } from '@mui/material'
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import SourceRoundedIcon from '@mui/icons-material/SourceRounded'
import FlagRoundedIcon from '@mui/icons-material/FlagRounded'

export default function QuestionCard({ question, selected, onSelect, onShowAnswer, answer, showAnswer, onOpenSource, reviewed, onToggleReview }) {
  const options = Object.entries(question.options || {}).sort(([a], [b]) => Number(a) - Number(b))
  const visualFallback = question.source?.visual_fallback?.path
  return (
    <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <Box sx={{ p: { xs: 2, md: 3 }, pb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1.5} mb={2}>
          <Stack direction="row" gap={1} flexWrap="wrap">
            <Chip color="primary" label={`Q${question.question_number}`} />
            <Chip label={question.part_name} variant="outlined" />
            <Chip label={question.language === 'hi' ? 'हिन्दी' : 'English'} variant="outlined" />
            {question.extraction?.status === 'verified_with_visual_fallback' && <Chip color="warning" label="Visual source fallback" />}
          </Stack>
          <Stack direction="row" spacing={0.5}>
            <Button startIcon={<FlagRoundedIcon />} size="small" color={reviewed ? 'warning' : 'inherit'} onClick={onToggleReview}>{reviewed ? 'Marked for review' : 'Mark review'}</Button>
            <Button startIcon={<SourceRoundedIcon />} size="small" onClick={onOpenSource}>Source</Button>
          </Stack>
        </Stack>

        {question.context_text && (
          <Box sx={{ p: 2, mb: 2, bgcolor: 'action.hover', borderRadius: 2, border: 1, borderColor: 'divider' }}>
            <Typography variant="overline" color="text.secondary" fontWeight={800}>Passage / context</Typography>
            <Typography sx={{ mt: 0.5, whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>{question.context_text}</Typography>
          </Box>
        )}

        <Typography variant="h5" sx={{ lineHeight: 1.55, whiteSpace: 'pre-wrap', mb: 2 }}>{question.question_text}</Typography>
        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={1.25}>
          {options.map(([label, text]) => {
            const chosen = selected === label
            return (
              <Grid size={{ xs: 12 }} key={label}>
                <Button fullWidth variant="outlined" color={chosen ? 'primary' : 'inherit'} onClick={() => onSelect(label)} sx={{ justifyContent: 'flex-start', textAlign: 'left', p: 1.5, borderWidth: chosen ? 2 : 1, bgcolor: chosen ? 'action.hover' : 'transparent' }}>
                  <Radio checked={chosen} tabIndex={-1} sx={{ p: 0, mr: 1.25 }} />
                  <Typography sx={{ fontWeight: chosen ? 800 : 500, whiteSpace: 'pre-wrap' }}><strong>{`(${label})`}</strong>{text ? ` ${text}` : '  [Visual content in source image]'}</Typography>
                </Button>
              </Grid>
            )
          })}
        </Grid>

        {visualFallback && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Some option content is rendered as vector artwork in the PDF (for example, fractions). The extracted JSON keeps a page crop as the authoritative visual fallback.
          </Alert>
        )}

        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.25} mt={2}>
          <Button variant="contained" startIcon={<VisibilityRoundedIcon />} onClick={onShowAnswer} disabled={!answer}>Show Answer</Button>
          {showAnswer && answer && <Chip color="success" label={`Correct answer: (${answer === 'Z' ? 'ALL' : answer})`} sx={{ alignSelf: 'center', py: 1.9, px: 0.5 }} />}
        </Stack>
      </Box>
    </Card>
  )
}
