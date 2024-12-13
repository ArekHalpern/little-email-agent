import { createClient } from '@/lib/auth/supabase/server'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { prisma } from '@/lib/db/prisma'
import { updateCustomerGoogleTokens } from '@/lib/db/actions'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: messageId } = await context.params

  try {
    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    console.log('Auth check:', {
      hasUser: !!user,
      userId: user?.id,
      error: userError
    })

    if (userError || !user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get customer and their tokens
    const customer = await prisma.customer.findUnique({
      where: { auth_user_id: user.id }
    })

    console.log('Customer lookup:', {
      found: !!customer,
      hasAccessToken: !!customer?.google_access_token,
      hasRefreshToken: !!customer?.google_refresh_token,
      tokenExpiry: customer?.google_token_expiry
    })

    if (!customer?.google_access_token) {
      return NextResponse.json({ error: 'Gmail not connected' }, { status: 401 })
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
    )

    oauth2Client.setCredentials({
      access_token: customer.google_access_token,
      refresh_token: customer.google_refresh_token || undefined,
      expiry_date: customer.google_token_expiry?.getTime()
    })

    // Handle token refresh
    oauth2Client.on('tokens', async (tokens) => {
      console.log('Token refresh occurred:', {
        hasNewAccessToken: !!tokens.access_token,
        hasNewRefreshToken: !!tokens.refresh_token,
        newExpiry: tokens.expiry_date
      })

      await updateCustomerGoogleTokens(customer.id, {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token || undefined,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined
      })
    })

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    // Test auth before fetching email
    try {
      await oauth2Client.getAccessToken()
      console.log('Access token verified successfully')
    } catch (tokenError) {
      console.error('Token verification failed:', tokenError)
      return NextResponse.json({ error: 'Invalid Gmail token' }, { status: 401 })
    }

    // Get full email content
    const email = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    })

    // Get full thread if it exists
    let thread = null
    if (email.data.threadId) {
      thread = await gmail.users.threads.get({
        userId: 'me',
        id: email.data.threadId,
        format: 'full'
      })
    }

    return NextResponse.json({ email: email.data, thread: thread?.data })
  } catch (error) {
    console.error('Full error:', error)
    return NextResponse.json({ error: 'Failed to fetch email' }, { status: 500 })
  }
} 