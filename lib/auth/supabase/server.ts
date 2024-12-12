import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { CookieOptions } from '@supabase/ssr'
import { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          try {
            // @ts-expect-error - Next.js types don't match implementation
            const cookie = cookieStore.get(name)
            return cookie?.value
          } catch {
            return undefined
          }
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            const nextCookieOptions: Partial<ResponseCookie> = {
              httpOnly: options.httpOnly,
              maxAge: options.maxAge,
              path: options.path,
              sameSite: options.sameSite,
              secure: options.secure,
            }
            // @ts-expect-error - Next.js types don't match implementation
            cookieStore.set(name, value, nextCookieOptions)
          } catch {
            // Silently handle cookie errors in production
          }
        },
        remove(name: string) {
          try {
            // @ts-expect-error - Next.js types don't match implementation
            cookieStore.delete(name)
          } catch {
            // Silently handle cookie errors in production
          }
        },
      },
    }
  )
}