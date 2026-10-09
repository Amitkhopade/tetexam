import { useState } from 'react'
import {
  Alert, Box, Button, Card, CardContent, Container, CssBaseline, InputAdornment,
  Stack, TextField, ThemeProvider, Typography
} from '@mui/material'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded'
import { lightTheme } from '../theme/theme'
import { login } from '../lib/auth'

export default function LoginPage({ onAuthenticated }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      const session = await login(username, password)
      onAuthenticated(session)
    } catch (e) {
      setError(e?.message || 'Unable to sign in.')
    } finally { setBusy(false) }
  }

  return (
    <ThemeProvider theme={lightTheme}><CssBaseline />
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2.5, bgcolor: 'background.default' }}>
        <Container maxWidth="sm">
          <Stack spacing={2} alignItems="center">
            <Box sx={{ width: 68, height: 68, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: 'background.default', boxShadow: '10px 10px 22px rgba(151,165,180,.35), -10px -10px 22px rgba(255,255,255,.95)' }}>
              <MenuBookRoundedIcon color="primary" sx={{ fontSize: 34 }} />
            </Box>
            <Stack alignItems="center" spacing={0.5}>
              <Typography variant="h4" align="center">Question Paper Navigator</Typography>
              <Typography color="text.secondary" align="center">Sign in to access question papers, timed exams and results.</Typography>
            </Stack>

            <Card sx={{ width: '100%', maxWidth: 460 }}>
              <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
                <Stack component="form" onSubmit={submit} spacing={2}>
                  <Typography variant="h6">Welcome back</Typography>
                  <TextField
                    label="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    autoFocus
                    fullWidth
                    InputProps={{ startAdornment: <InputAdornment position="start"><PersonRoundedIcon color="action" /></InputAdornment> }}
                  />
                  <TextField
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    fullWidth
                    InputProps={{ startAdornment: <InputAdornment position="start"><LockRoundedIcon color="action" /></InputAdornment> }}
                  />
                  {error && <Alert severity="error">{error}</Alert>}
                  <Button type="submit" size="large" variant="contained" disabled={busy || !username || !password}>
                    {busy ? 'Signing in…' : 'Sign in'}
                  </Button>
                  <Typography variant="caption" color="text.secondary" align="center">
                    Local MVP authentication is enabled for this no-backend project. Replace the auth adapter with a managed provider before public production use.
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Container>
      </Box>
    </ThemeProvider>
  )
}
