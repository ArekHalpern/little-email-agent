import { createClient } from '@/lib/auth/supabase/server'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: messageId } = await context.params

  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.provider_token) {
      return NextResponse.json({ error: 'Not authenticated with Google' }, { status: 401 })
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`
    )
    
    oauth2Client.setCredentials({
      access_token: session.provider_token
    })

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

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
  } catch (error: unknown) {
    const gmailError = error as { message: string }
    console.error('Gmail API error:', error)
    return NextResponse.json({ error: gmailError.message }, { status: 500 })
  }
} 