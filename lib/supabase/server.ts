import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

/**
 * Cookie-based server Supabase client, typed against the live schema.
 *
 * Use in Server Components, Route Handlers, and Server Actions. The server layer
 * keeps server-only secrets (future GVL token, master-DB push) out of the browser.
 *
 * IMPORTANT: for auth decisions in server code, call `supabase.auth.getUser()`
 * (verifies with the auth server). Do NOT trust `getSession()`.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. See .env.local.example.',
    )
  }

  const cookieStore = cookies()

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // Called from a Server Component (cookies are read-only there).
          // Safe to ignore — the middleware refreshes the session cookie.
        }
      },
    },
  })
}
