const SESSION_KEY = 'qpn:auth:v1'

// Static/local authentication adapter for this GitHub-backed, no-backend build.
// IMPORTANT: this is a functional MVP gate, not production-grade security.
// Replace this adapter with Firebase/Auth0/Supabase/etc. before public production use.
const USERS = [
  {
    username: 'admin',
    displayName: 'Administrator',
    role: 'admin',
    passwordHash: 'e86f78a8a3caf0b60d8e74e5942aa6d86dc150cd3c03338aef25b7d2d7e3acc7', // Admin@123
  },
  {
    username: 'student',
    displayName: 'Student',
    role: 'student',
    passwordHash: 'b2a1f4fd0a460606b34c8913e2981dac8d2e283d778aba586c416ee2629bfa54', // Student@123
  },
]

async function sha256(value) {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function login(username, password) {
  const normalized = String(username || '').trim().toLowerCase()
  const user = USERS.find((item) => item.username.toLowerCase() === normalized)
  if (!user) throw new Error('Invalid username or password.')
  const passwordHash = await sha256(String(password || ''))
  if (passwordHash !== user.passwordHash) throw new Error('Invalid username or password.')

  const session = {
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    loginAt: new Date().toISOString(),
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function logout() {
  try { localStorage.removeItem(SESSION_KEY) } catch {}
}

export function isAuthenticated() {
  return Boolean(getSession())
}

export function isAdmin() {
  return getSession()?.role === 'admin'
}
