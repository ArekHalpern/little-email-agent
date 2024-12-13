import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { updateCustomerGoogleTokens } from '@/lib/db/actions'
import { headers } from 'next/headers'
import { prisma } from '@/lib/db/prisma'
import { createClient } from '@/lib/auth/supabase/server'

async function getGmailClient() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user?.id) {
    throw new Error('Not authenticated')
  }

  const customer = await prisma.customer.findUnique({
    where: { auth_user_id: user.id },
    select: {
      id: true,
      google_access_token: true,
      google_refresh_token: true,
      google_token_expiry: true
    }
  })

  if (!customer?.google_access_token) {
    throw new Error('Gmail not connected')
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
    await updateCustomerGoogleTokens(customer.id, {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token || undefined,
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined
    })
  })

  return {
    gmail: google.gmail({ version: 'v1', auth: oauth2Client }),
    customer
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: messageId } = await context.params

  try {
    const { gmail } = await getGmailClient()

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
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to fetch email' }, { status: 500 })
  }
} 