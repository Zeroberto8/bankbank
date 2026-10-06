import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Zeitlimit für Anfragen: im Funkloch hängen Verbindungen sonst minutenlang,
// bevor der Browser aufgibt. Danach greift der Offline-Zwischenspeicher.
const TIMEOUT_MS = 45000
const fetchWithTimeout = (input, init = {}) => {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  init.signal?.addEventListener('abort', () => ctrl.abort())
  return fetch(input, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(timer))
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchWithTimeout },
})
