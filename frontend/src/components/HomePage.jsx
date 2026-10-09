import { Box, Button, Card, CardContent, Chip, Container, Grid, Stack, Typography, FormControl, InputLabel, MenuItem, Select } from '@mui/material'
import { useState } from 'react'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded'
import QuizRoundedIcon from '@mui/icons-material/QuizRounded'
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded'

function durationLabel(minutes = 150) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours ? `${hours} hr ` : ''}${mins ? `${mins} min` : ''}`.trim()
}

export default function HomePage({ papers, onStart, onOpenExams, showHero = true }) {
  const featured = papers
  const [languagesByPaper, setLanguagesByPaper] = useState(() => Object.fromEntries((papers || []).map((paper) => [paper.paper_id, (paper.available_languages || ['en'])[0] || 'en'])))
  function selectedLanguage(paper) { return languagesByPaper[paper.paper_id] || (paper.available_languages || ['en'])[0] || 'en' }
  function startPaper(paper) { onStart({ ...paper, preferred_language: selectedLanguage(paper) }) }
  return (
    <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={4}>
        {showHero && <Card sx={{ overflow: 'hidden', position: 'relative' }}>
          <CardContent sx={{ p: { xs: 2.5, md: 4.5 } }}>
            <Stack spacing={2.2}>
              <Chip label="TIMED ASSESSMENT PLATFORM" color="primary" sx={{ alignSelf: 'flex-start' }} />
              <Typography variant="h2" sx={{ fontSize: { xs: 32, md: 52 }, maxWidth: 850, lineHeight: 1.06 }}>Practice smarter with a clean, timed exam experience.</Typography>
              <Typography color="text.secondary" sx={{ maxWidth: 760, fontSize: { md: 18 } }}>Choose a paper set, start the timer, answer every question, and receive your final correct-answer score automatically when you submit or the timer expires.</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
                <Button variant="contained" size="large" endIcon={<ArrowForwardRoundedIcon />} onClick={onOpenExams}>Explore Question Papers</Button>
                {featured[0] && <Button variant="outlined" size="large" onClick={() => startPaper(featured[0])}>Start Set {featured[0].booklet_code}</Button>}
              </Stack>
            </Stack>
          </CardContent>
        </Card>}

        <Stack spacing={1}>
          <Typography variant="h5">Available question papers</Typography>
          <Typography color="text.secondary">Each set is loaded dynamically from the project data catalog.</Typography>
        </Stack>

        <Grid container spacing={2}>
          {featured.map((paper) => <Grid key={paper.booklet_code} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Stack spacing={1.6} sx={{ flex: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center"><Chip label={`SET ${paper.booklet_code}`} color="primary" variant="outlined" /><Chip label={paper.status || 'ready'} size="small" /></Stack>
                  <Typography variant="h6">{paper.title || `${paper.exam || 'Question Paper'} • Set ${paper.booklet_code}`}</Typography>
                  <Stack spacing={0.8} color="text.secondary">
                    <Stack direction="row" spacing={1} alignItems="center"><QuizRoundedIcon fontSize="small" /><Typography variant="body2">{paper.question_count || 150} questions</Typography></Stack>
                    <Stack direction="row" spacing={1} alignItems="center"><AccessTimeRoundedIcon fontSize="small" /><Typography variant="body2">{durationLabel(paper.duration_minutes || 150)}</Typography></Stack>
                    {paper.exam_date && <Stack direction="row" spacing={1} alignItems="center"><CalendarMonthRoundedIcon fontSize="small" /><Typography variant="body2">{paper.exam_date}</Typography></Stack>}
                  </Stack>
                  {(paper.available_languages || []).length > 1 && <FormControl size="small" fullWidth sx={{ mt: 1 }}>
                    <InputLabel id={`language-${paper.booklet_code}`}>Language</InputLabel>
                    <Select labelId={`language-${paper.booklet_code}`} label="Language" value={selectedLanguage(paper)} onChange={(event) => setLanguagesByPaper((prev) => ({ ...prev, [paper.paper_id]: event.target.value }))}>
                      {(paper.available_languages || []).map((language) => <MenuItem key={language} value={language}>{language === 'hi' ? 'Hindi' : language === 'en' ? 'English' : language}</MenuItem>)}
                    </Select>
                  </FormControl>}
                </Stack>
                <Button sx={{ mt: 2 }} fullWidth variant="contained" onClick={() => startPaper(paper)} endIcon={<ArrowForwardRoundedIcon />}>Start Exam</Button>
              </CardContent>
            </Card>
          </Grid>)}
        </Grid>
      </Stack>
    </Container>
  )
}
