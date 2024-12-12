import { createClient } from '@/lib/auth/supabase/server'
import { NextResponse } from 'next/server'
import { createCustomer } from '@/lib/db/actions'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  const provider = requestUrl.searchParams.get('provider')

  if (code) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data?.user) {
      // Store basic user info during development
      if (provider === 'google') {
        try {
          await createCustomer({
            authUserId: data.user.id,
            email: data.user.email!,
            name: data.user.user_metadata?.full_name
          })
        } catch (err) {
          console.error('Error creating customer:', err)
          return NextResponse.redirect(`${requestUrl.origin}/error`) 
        }
      }

      return NextResponse.redirect(`${requestUrl.origin}${next}`)
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}/error`)
} 