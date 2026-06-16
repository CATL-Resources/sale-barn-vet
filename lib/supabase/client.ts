'use client'

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

/**
 * Browser-side Supabase client, typed against the live schema (types/supabase.ts).
 * Uses the public anon key. Auth/session wiring lands with the auth build.
 */
export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Copy .env.local.example to .env.local and fill it in (Supabase dashboard -> Project Settings -> API).',
    )
  }

  return createClient<Database>(url, anonKey)
}
