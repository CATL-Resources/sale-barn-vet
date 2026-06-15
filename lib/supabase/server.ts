import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

/**
 * Server-side Supabase client, typed against the live schema (types/supabase.ts).
 *
 * The server layer exists so server-only secrets (e.g. the future GVL integration
 * token and the master-DB push) never reach the browser. For now it uses the anon
 * key with sessions disabled; cookie/session handling lands with the auth build.
 */
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Copy .env.local.example to .env.local and fill it in (Supabase dashboard -> Project Settings -> API).',
    )
  }

  return createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
