import { type NextRequest } from 'next/server'
import { updateSession } from './lib/auth/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Only protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    return await updateSession(request)
  }
}

export const config = {
  matcher: [
    // Only run middleware on dashboard routes
    '/dashboard/:path*'
  ],
}