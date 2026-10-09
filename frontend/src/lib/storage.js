const PREFIX = 'qpn:v1:'

export function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(PREFIX + key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

export function writeJson(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Storage can be blocked in private browsing or quota-limited environments.
  }
}

export function clearKey(key) {
  try { localStorage.removeItem(PREFIX + key) } catch {}
}
