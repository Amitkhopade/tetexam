import { Card, CardContent, Container, Stack, Typography } from '@mui/material'

const content = {
  instructions: {
    title: 'How the exam works',
    intro: 'Choose a paper from Question Papers and click Start Exam. The countdown begins immediately for that attempt.',
    items: [
      'Select one answer for each question. Your choices are preserved in the current browser session.',
      'Use the question map to move between questions and mark items for review.',
      'The timer continues after a browser refresh. When it reaches 00:00 the attempt is submitted automatically.',
      'Your result shows correct answers, attempted questions, and answer-key coverage available for scoring.',
    ],
  },
  about: {
    title: 'About Question Paper Navigator',
    intro: 'A lightweight exam application built around static JSON datasets and an existing React/Vite exam engine.',
    items: [
      'Question papers and answer keys remain project data; no SQL database is required for the exam engine.',
      'New papers can be added through the existing local administrator upload workflow.',
      'The architecture keeps content ingestion and exam execution separate so future automation can feed the same engine.',
    ],
  },
}

export default function InfoPage({ type }) {
  const page = content[type]
  return <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
    <Card>
      <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
        <Stack spacing={2}>
          <Typography variant="h4">{page.title}</Typography>
          <Typography color="text.secondary" sx={{ fontSize: 17 }}>{page.intro}</Typography>
          <Stack spacing={1.2}>
            {page.items.map((item, i) => <Typography key={i} sx={{ lineHeight: 1.7 }}>• {item}</Typography>)}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  </Container>
}
