import { useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Container, CssBaseline, InputAdornment, Link, Stack, TextField, ThemeProvider, Typography } from '@mui/material'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded'
import { lightTheme } from '../theme/theme'
import { login } from '../lib/auth'

export default function LoginPage({ onAuthenticated, onNavigate }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    try { onAuthenticated(await login(identifier, password)) }
    catch (e) { setError(e?.message || 'Unable to sign in.') }
    finally { setBusy(false) }
  }

  return <ThemeProvider theme={lightTheme}><CssBaseline />
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2.5, bgcolor: 'background.default' }}>
      <Container maxWidth="sm"><Stack spacing={2} alignItems="center">
        <Button color="inherit" onClick={() => onNavigate('/')} startIcon={<MenuBookRoundedIcon />}>Question Paper Navigator</Button>
        <Stack alignItems="center" spacing={0.5}><Typography variant="h4" align="center">Welcome back</Typography><Typography color="text.secondary" align="center">Sign in to access your exams, progress and results.</Typography></Stack>
        <Card sx={{ width: '100%', maxWidth: 480 }}><CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Stack component="form" onSubmit={submit} spacing={2}>
            <TextField label="Username or email" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" autoFocus required fullWidth InputProps={{ startAdornment: <InputAdornment position="start"><PersonRoundedIcon color="action" /></InputAdornment> }} />
            <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required fullWidth InputProps={{ startAdornment: <InputAdornment position="start"><LockRoundedIcon color="action" /></InputAdornment> }} />
            {error && <Alert severity="error">{error}</Alert>}
            <Button type="submit" size="large" variant="contained" disabled={busy || !identifier || !password}>{busy ? 'Signing in…' : 'Sign in'}</Button>
            <Stack direction="row" justifyContent="space-between" gap={1} flexWrap="wrap">
              <Link component="button" type="button" underline="hover" onClick={() => onNavigate('/forgot-password')}>Forgot password?</Link>
              <Link component="button" type="button" underline="hover" onClick={() => onNavigate('/register')}>Request an account</Link>
            </Stack>
            <Typography variant="caption" color="text.secondary" align="center">New accounts require administrator approval. After approval, set your own password using the one-time email link.</Typography>
          </Stack>
        </CardContent></Card>
      </Stack></Container>
    </Box>
  </ThemeProvider>
}
