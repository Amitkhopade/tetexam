import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
export default function SourceDialog({ open, onClose, question }) {
  if (!question) return null
  const path = question.source?.visual_fallback?.path
  return <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
    <DialogTitle>Source trace — Q{question.question_number}</DialogTitle>
    <DialogContent dividers>
      <Typography variant="body2" color="text.secondary">PDF page: {question.source?.pdf_page ?? '—'} • Column: {question.source?.column ?? '—'} • Confidence: {question.extraction?.confidence ?? '—'}</Typography>
      <Typography variant="body2" sx={{ mt: 1 }}>Bounding box: {JSON.stringify(question.source?.bbox || [])}</Typography>
      {path ? <Box component="img" src={`./${path}`} alt={`Source crop for question ${question.question_number}`} sx={{ width: '100%', mt: 2, borderRadius: 2, border: 1, borderColor: 'divider' }} /> : <Typography sx={{ mt: 2 }} color="text.secondary">No visual fallback was required for this question.</Typography>}
    </DialogContent>
    <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
  </Dialog>
}
