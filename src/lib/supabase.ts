import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
  )
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      // ✅ Enable automatic token refresh
      autoRefreshToken: true,
      // ✅ Persist session in local storage (survives page reloads)
      persistSession: true,
      // ✅ Detect OAuth/magic link redirects
      detectSessionInUrl: true,
      // ✅ Use localStorage as primary storage (more persistent than sessionStorage)
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      // ✅ Add storage key to avoid conflicts
      storageKey: 'rentflow_supabase_auth',
      // ✅ Set flow type for better PKCE security
      flowType: 'pkce',
    },
  }
)
