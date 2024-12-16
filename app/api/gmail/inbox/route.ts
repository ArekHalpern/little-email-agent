import { createClient } from '@/lib/auth/supabase/server'
import { NextResponse, NextRequest } from 'next/server'
import type { gmail_v1 } from 'googleapis'
import { getGmailClient } from '@/lib/db/actions'
import { emailCache } from '@/lib/cache'
import type { EmailCacheData } from '@/lib/cache'
import type { Email } from '@/app/dashboard/types'

export async function GET(request: NextRequest) {
  try {
    await emailCache.initialize();
    
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const search = request.nextUrl.searchParams.get('q') || '';
    const pageSize = 10;
    
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const gmail = await getGmailClient(user.id);

    // Add some logging
    console.log('Fetching emails for user:', user.id);

    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: pageSize,
      q: search,
      labelIds: ['INBOX'],
    });

    // Log the response
    console.log('Gmail response:', {
      messagesCount: response.data.messages?.length,
      totalResults: response.data.resultSizeEstimate,
    });

    const messages = response.data.messages || [];
    const totalEmails = response.data.resultSizeEstimate || 0;

    // Get message details in parallel
    const emailDetails = await Promise.all(
      messages.map(msg => 
        gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date'],
        })
      )
    );

    const result: EmailCacheData = {
      messages: emailDetails.map(detail => ({
        id: detail.data.id!,
        labelIds: detail.data.labelIds || [],
        snippet: detail.data.snippet || "",
        threadId: detail.data.threadId || undefined,
        internalDate: detail.data.internalDate || "",
        payload: {
          headers: detail.data.payload?.headers || [],
          parts: detail.data.payload?.parts,
          body: detail.data.payload?.body,
        }
      } as Email)),
      totalEmails,
      nextPageToken: response.data.nextPageToken || undefined,
    };

    // Log the processed result
    console.log('Processed emails:', {
      count: result.messages?.length,
      totalEmails: result.totalEmails,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('Gmail fetch error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 