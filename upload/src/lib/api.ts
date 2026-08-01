// Tiny fetch helper with error handling
export async function api<T = any>(url: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts?.headers || {}) },
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error((data as any).error || `request failed: ${r.status}`)
  return data as T
}

// Socket.io helper — connects to the live-service mini-service via the gateway
// The Caddy gateway requires `XTransformPort=3003` in the query string.
export function liveSocketUrl(): string {
  return `/?XTransformPort=3003`
}
