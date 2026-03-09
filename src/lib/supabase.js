import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'public' },
  global: {
    headers: { 'x-connection-timeout': '30000' },
    fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(30000) }),
  },
})
