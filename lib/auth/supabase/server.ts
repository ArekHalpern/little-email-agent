import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { CookieOptions } from '@supabase/ssr'
import { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

export function createClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          try {
            const cookieStore = await cookies()
            const cookie = cookieStore.get(name)
            return cookie?.value
          } catch {
            return undefined
          }
        },
        async set(name: string, value: string, options: CookieOptions) {
          try {
            const cookieStore = await cookies()
            const nextCookieOptions: Partial<ResponseCookie> = {
              httpOnly: options.httpOnly,
              maxAge: options.maxAge,
              path: options.path,
              sameSite: options.sameSite,
              secure: options.secure,
            }
            cookieStore.set(name, value, nextCookieOptions)
          } catch {
            // Silently handle cookie errors in production
          }
        },
        async remove(name: string) {
          try {
            const cookieStore = await cookies()
            cookieStore.delete(name)
          } catch {
            // Silently handle cookie errors in production
          }
        },
      },
    }
  )
}