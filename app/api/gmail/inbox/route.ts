import { createClient } from '@/lib/auth/supabase/server'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'

interface GmailAPIError {
  response?: {
    data?: unknown
  }
  message: string
}

export async function GET() {
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

    // Fetch recent emails
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 10
    })

    const emails = response.data.messages || []
    const emailDetails = []

    // Get metadata for each email
    for (const email of emails) {
      const details = await gmail.users.messages.get({
        userId: 'me',
        id: email.id!,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Date']
      })
      emailDetails.push(details.data)
    }

    return NextResponse.json(emailDetails)
  } catch (error: unknown) {
    const gmailError = error as GmailAPIError
    console.error('Gmail API error:', gmailError?.response?.data || gmailError)
    return NextResponse.json(
      { error: 'Failed to fetch emails', details: gmailError?.response?.data || gmailError.message }, 
      { status: 500 }
    )
  }
} 