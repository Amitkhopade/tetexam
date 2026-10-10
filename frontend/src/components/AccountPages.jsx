import { useMemo, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Container, CssBaseline, Link, Stack, TextField, ThemeProvider, Typography } from '@mui/material'
import { lightTheme } from '../theme/theme'

async function post(path, payload) {
  const response = await fetch(path, { method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) })
  const body = await response.json().catch(()=>({}))
  if(!response.ok || body.ok===false) throw new Error(body.message || `Request failed (${response.status}).`)
  return body
}

function Shell({ title, subtitle, onNavigate, children }) {
  return <ThemeProvider theme={lightTheme}><CssBaseline/><Box sx={{minHeight:'100vh',display:'grid',placeItems:'center',p:2.5,bgcolor:'background.default'}}><Container maxWidth="sm"><Stack spacing={2}>
    <Button onClick={()=>onNavigate('/')} color="inherit" sx={{alignSelf:'flex-start'}}>← Back to home</Button>
    <Card><CardContent sx={{p:{xs:2.5,sm:3.5}}}><Stack spacing={2}><Typography variant="h4">{title}</Typography><Typography color="text.secondary">{subtitle}</Typography>{children}</Stack></CardContent></Card>
  </Stack></Container></Box></ThemeProvider>
}

export function RegisterPage({ onNavigate }) {
  const [values,setValues]=useState({full_name:'',username:'',email:'',mobile:'',note:''})
  const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [success,setSuccess]=useState('')
  const change=(key)=>(e)=>setValues(v=>({...v,[key]:e.target.value}))
  async function submit(e){e.preventDefault();setBusy(true);setError('');setSuccess('');try{const result=await post('/api/auth/register',values);setSuccess(result.message);setValues({full_name:'',username:'',email:'',mobile:'',note:''})}catch(err){setError(err.message)}finally{setBusy(false)}}
  return <Shell title="Request an account" subtitle="Create an access request. An administrator reviews each request before an account can be activated." onNavigate={onNavigate}>
    <Stack component="form" onSubmit={submit} spacing={1.8}>
      <TextField label="Full name" value={values.full_name} onChange={change('full_name')} required inputProps={{maxLength:100}} />
      <TextField label="Username" value={values.username} onChange={change('username')} required helperText="3–32 characters: letters, numbers, dots, underscores or hyphens." inputProps={{maxLength:32}} />
      <TextField label="Email address" type="email" value={values.email} onChange={change('email')} required autoComplete="email" />
      <TextField label="Mobile number" value={values.mobile} onChange={change('mobile')} required autoComplete="tel" helperText="Include country code when appropriate." />
      <TextField label="Reason for access (optional)" value={values.note} onChange={change('note')} multiline minRows={2} inputProps={{maxLength:500}} />
      {error && <Alert severity="error">{error}</Alert>}{success && <Alert severity="success">{success}</Alert>}
      <Button type="submit" variant="contained" size="large" disabled={busy}>{busy?'Submitting…':'Submit for approval'}</Button>
      <Typography variant="body2" color="text.secondary">Already have an account? <Link component="button" type="button" onClick={()=>onNavigate('/login')}>Sign in</Link></Typography>
    </Stack>
  </Shell>
}

export function ForgotPasswordPage({ onNavigate }) {
  const [email,setEmail]=useState(''); const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [success,setSuccess]=useState('')
  async function submit(e){e.preventDefault();setBusy(true);setError('');setSuccess('');try{const body=await post('/api/auth/forgot-password',{email});setSuccess(body.message)}catch(err){setError(err.message)}finally{setBusy(false)}}
  return <Shell title="Reset your password" subtitle="If your account is eligible, we will send a one-time reset link to your email." onNavigate={onNavigate}>
    <Stack component="form" onSubmit={submit} spacing={2}><TextField label="Account email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />{error&&<Alert severity="error">{error}</Alert>}{success&&<Alert severity="success">{success}</Alert>}<Button type="submit" variant="contained" disabled={busy}>{busy?'Sending…':'Send reset link'}</Button><Link component="button" type="button" onClick={()=>onNavigate('/login')}>Back to sign in</Link></Stack>
  </Shell>
}

export function PasswordTokenPage({ purpose='activate', token, onNavigate }) {
  const [password,setPassword]=useState(''); const [confirm,setConfirm]=useState(''); const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [success,setSuccess]=useState('')
  const title=purpose==='activate'?'Activate your account':'Choose a new password'
  const endpoint=purpose==='activate'?'/api/auth/activate':'/api/auth/reset-password'
  const valid=useMemo(()=>password.length>=12 && /[A-Za-z]/.test(password) && /[0-9]/.test(password) && password===confirm,[password,confirm])
  async function submit(e){e.preventDefault();setBusy(true);setError('');setSuccess('');try{const body=await post(endpoint,{token,password});setSuccess(body.message);setPassword('');setConfirm('')}catch(err){setError(err.message)}finally{setBusy(false)}}
  return <Shell title={title} subtitle="Use a unique password with at least 12 characters, including letters and numbers." onNavigate={onNavigate}>
    <Stack component="form" onSubmit={submit} spacing={1.8}>
      {!token&&<Alert severity="error">The link token is missing. Open the complete link from your email.</Alert>}
      <TextField label="New password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="new-password" />
      <TextField label="Confirm password" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required autoComplete="new-password" />
      <Typography variant="caption" color="text.secondary">Avoid shared passwords such as Student@123. Each account should have its own password.</Typography>
      {error&&<Alert severity="error">{error}</Alert>}{success&&<Alert severity="success">{success}<Box sx={{mt:1}}><Link component="button" onClick={()=>onNavigate('/login')}>Continue to sign in</Link></Box></Alert>}
      <Button type="submit" variant="contained" disabled={busy||!token||!valid}>{busy?'Saving…':purpose==='activate'?'Activate account':'Reset password'}</Button>
    </Stack>
  </Shell>
}

export function ChangePasswordPage({ session, onNavigate, onPasswordChanged, forced=false }) {
  const [current,setCurrent]=useState(''); const [next,setNext]=useState(''); const [confirm,setConfirm]=useState(''); const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [success,setSuccess]=useState('')
  async function submit(e){e.preventDefault();setBusy(true);setError('');setSuccess('');try{const response=await post('/api/auth/change-password',{current_password:current,new_password:next});setSuccess(response.message);onPasswordChanged(response.user)}catch(err){setError(err.message)}finally{setBusy(false)}}
  return <Shell title={forced?'Change your password':'Security settings'} subtitle={forced?'Change your temporary password before using the application.':'Update the password for your account.'} onNavigate={onNavigate}>
    <Stack spacing={1.8} component="form" onSubmit={submit}>
      {session&&<Typography color="text.secondary">Signed in as {session.username} ({session.role})</Typography>}
      <TextField label="Current password" type="password" value={current} onChange={e=>setCurrent(e.target.value)} required autoComplete="current-password" />
      <TextField label="New password" type="password" value={next} onChange={e=>setNext(e.target.value)} required autoComplete="new-password" helperText="At least 12 characters, with letters and numbers." />
      <TextField label="Confirm new password" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required autoComplete="new-password" />
      {error&&<Alert severity="error">{error}</Alert>}{success&&<Alert severity="success">{success}</Alert>}
      <Button type="submit" variant="contained" disabled={busy||next.length<12||!/^[\s\S]*[A-Za-z][\s\S]*$/.test(next)||!/[0-9]/.test(next)||next!==confirm}>{busy?'Saving…':'Change password'}</Button>
      {!forced&&<Button variant="text" onClick={()=>onNavigate('/profile')}>Back to profile</Button>}
    </Stack>
  </Shell>
}

export function AccountPanel({ session, onSessionUpdate, onNavigate }) {
  const [showPassword,setShowPassword]=useState(false)
  return <Container maxWidth="md" sx={{py:{xs:3,md:5}}}><Stack spacing={2}>
    <Typography variant="h4">My account</Typography><Typography color="text.secondary">Welcome, {session?.fullName || session?.displayName || session?.username}.</Typography>
    <Card><CardContent><Stack spacing={1.2}><Typography variant="h6">Profile details</Typography><Typography><b>Name:</b> {session?.fullName || '—'}</Typography><Typography><b>Username:</b> {session?.username || '—'}</Typography><Typography><b>Email:</b> {session?.email || '—'}</Typography><Typography><b>Mobile:</b> {session?.mobile || '—'}</Typography><Typography><b>Role:</b> {session?.role || '—'}</Typography><Typography><b>Status:</b> {session?.status || 'active'}</Typography><Button variant="outlined" sx={{alignSelf:'flex-start'}} onClick={()=>setShowPassword(v=>!v)}>{showPassword?'Hide password form':'Change password'}</Button></Stack></CardContent></Card>
    {showPassword&&<ChangePasswordPage session={session} onNavigate={onNavigate} onPasswordChanged={onSessionUpdate} />}
  </Stack></Container>
}
