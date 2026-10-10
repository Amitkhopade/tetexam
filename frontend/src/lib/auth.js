let cachedSession = null

async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok || body.ok === false) throw new Error(body.message || `Request failed (${response.status}).`)
  return body
}

export async function login(identifier, password) {
  const body = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) })
  cachedSession = body.user || null
  return cachedSession
}

// This user object is UI state only. The authority is always the HttpOnly server cookie + database lookup.
export async function getSession() {
  try {
    const body = await request('/api/auth/me')
    cachedSession = body.user || null
    return cachedSession
  } catch {
    cachedSession = null
    return null
  }
}

export function getCachedSession() { return cachedSession }

export async function logout() {
  try { await request('/api/auth/logout', { method: 'POST', body: JSON.stringify({}) }) }
  finally { cachedSession = null }
}

export async function isAuthenticated() { return Boolean(await getSession()) }
export async function isAdmin() { return (await getSession())?.role === 'admin' }
