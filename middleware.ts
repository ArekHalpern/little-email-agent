import { type NextRequest } from 'next/server'
import { updateSession } from './lib/auth/supabase/middleware'

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/dashboard') || 
      request.nextUrl.pathname.startsWith('/api/gmail')) {
    return await updateSession(request)
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/gmail/:path*'
  ],
}