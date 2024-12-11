import { type NextRequest } from 'next/server'
import { updateSession } from './lib/auth/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Skip auth check for landing pages
  if (request.nextUrl.pathname === '/' || 
      request.nextUrl.pathname.startsWith('/blog') ||
      request.nextUrl.pathname.startsWith('/features') ||
      request.nextUrl.pathname.startsWith('/pricing')) {
    return;
  }
  
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}