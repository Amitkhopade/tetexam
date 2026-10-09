import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Switch, Typography } from '@mui/material'
export default function SettingsDialog({ open, onClose, demo, onDemoToggle }) {
  return <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>Settings</DialogTitle>
    <DialogContent dividers>
      <FormControlLabel control={<Switch checked={demo} onChange={(e) => onDemoToggle(e.target.checked)} />} label="Enable demo answer key" />
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
        Demo answers are synthetic and are never used as official answers. Keep this off when publishing real exam content.
      </Typography>
    </DialogContent>
    <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
  </Dialog>
}
