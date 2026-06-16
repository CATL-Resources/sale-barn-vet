import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'

/**
 * Refreshes the Supabase auth session on each request and protects app routes.
 * Follows the official @supabase/ssr Next.js App Router pattern.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Without env (e.g. during build), do nothing. Routes are unprotected until env is set.
  if (!url || !anonKey) {
    return supabaseResponse
  }

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        )
      },
    },
  })

  // Do NOT run code between createServerClient and getUser() (token refresh ordering).
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Invite-only: anyone not logged in gets sent to /login (which is itself public).
  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}
