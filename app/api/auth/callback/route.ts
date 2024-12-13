import { createClient } from '@/lib/auth/supabase/server'
import { NextResponse } from 'next/server'
import { createCustomer, updateCustomerGoogleTokens } from '@/lib/db/actions'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  
  console.log('Auth callback received:', { code, next, url: request.url })

  if (code) {
    const supabase = createClient()
    
    // First, exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    console.log('Session exchange result:', {
      user: data?.user?.id,
      hasSession: !!data?.session,
      hasProviderToken: !!data?.session?.provider_token,
      provider: data?.user?.app_metadata?.provider,
      error,
      identities: data?.user?.identities
    })
    
    if (!error && data?.user && data.session?.provider_token) {
      try {
        const customer = await createCustomer({
          authUserId: data.user.id,
          email: data.user.email!,
          name: data.user.user_metadata?.full_name
        })

        console.log('Customer created/found:', {
          customerId: customer.id,
          email: customer.email
        })

        // Always store tokens for Google auth
        await updateCustomerGoogleTokens(customer.id, {
          accessToken: data.session.provider_token,
          refreshToken: data.session.provider_refresh_token || undefined,
          expiryDate: data.session.expires_at ? 
            new Date(data.session.expires_at * 1000) : 
            undefined
        })
        
        console.log('Google tokens stored for customer:', customer.id)
        
        return NextResponse.redirect(`${requestUrl.origin}${next}`)
      } catch (err) {
        console.error('Error setting up customer:', err)
        return NextResponse.redirect(`${requestUrl.origin}/error`) 
      }
    }
  }

  // If we get here, something went wrong
  console.error('Auth failed:', { code })
  return NextResponse.redirect(`${requestUrl.origin}/error`)
} 