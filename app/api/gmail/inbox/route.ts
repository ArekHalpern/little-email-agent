import { createClient } from '@/lib/auth/supabase/server'
import { NextResponse, NextRequest } from 'next/server'
import { google } from 'googleapis'
import type { gmail_v1 } from 'googleapis'
import { prisma } from '@/lib/db/prisma'
import { updateCustomerGoogleTokens } from '@/lib/db/actions'

export async function GET(request: NextRequest) {
  try {
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const search = request.nextUrl.searchParams.get('q') || '';
    const pageSize = 10;
    
    const supabase = createClient()
    
    // Use getUser instead of getSession for better security
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get customer and their tokens
    const customer = await prisma.customer.findUnique({
      where: { auth_user_id: user.id }
    })

    if (!customer?.google_access_token) {
      return NextResponse.json({ error: 'Gmail not connected' }, { status: 401 })
    }

    // Get fresh session for tokens
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'No active session' }, { status: 401 })
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
      console.log('Gmail token refreshed')
      await updateCustomerGoogleTokens(customer.id, {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token || undefined,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined
      })
    })

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    // Add token verification back
    try {
      await oauth2Client.getAccessToken()
    } catch {
      return NextResponse.json(
        { error: 'Gmail token expired or invalid' }, 
        { status: 401 }
      )
    }

    try {
      // First get total count of messages with search query
      const countResponse: { data: gmail_v1.Schema$ListMessagesResponse } = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 1,
        q: search
      });
      
      const totalEmails = countResponse.data.resultSizeEstimate || 0;
      let currentPageToken: string | undefined = undefined;
      let currentPage = 1;

      // Navigate to requested page
      while (currentPage < page) {
        const tempResponse: { data: gmail_v1.Schema$ListMessagesResponse } = await gmail.users.messages.list({
          userId: 'me',
          maxResults: pageSize,
          pageToken: currentPageToken,
          q: search
        });
        
        currentPageToken = tempResponse.data.nextPageToken || undefined;
        if (!currentPageToken) break;
        currentPage++;
      }

      // Get emails for current page
      const response: { data: gmail_v1.Schema$ListMessagesResponse } = await gmail.users.messages.list({
        userId: 'me',
        maxResults: pageSize,
        pageToken: currentPageToken,
        q: search
      });
      
      const emails = response.data.messages || [];
      const emailDetails = [];

      // Get full message details including thread info
      for (const email of emails) {
        if (email.id) {
          const details = await gmail.users.messages.get({
            userId: 'me',
            id: email.id,
            format: 'full',
            metadataHeaders: ['From', 'Subject', 'Date']
          });
          
          emailDetails.push({
            ...details.data,
            labelIds: details.data.labelIds
          });
        }
      }

      return NextResponse.json({
        messages: emailDetails,
        totalEmails,
        nextPageToken: response.data.nextPageToken
      });
    } catch {
      return NextResponse.json(
        { error: 'Failed to fetch emails from Gmail' }, 
        { status: 500 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: 'An unexpected error occurred' }, 
      { status: 500 }
    );
  }
} 