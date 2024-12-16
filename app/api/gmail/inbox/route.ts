import { createClient } from '@/lib/auth/supabase/server'
import { NextResponse, NextRequest } from 'next/server'
import type { gmail_v1 } from 'googleapis'
import { getGmailClient } from '@/lib/db/actions'
import { emailCache } from '@/lib/cache'
import type { EmailCacheData } from '@/lib/cache'

export async function GET(request: NextRequest) {
  try {
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const search = request.nextUrl.searchParams.get('q') || '';
    const pageSize = 10;
    
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Create cache key based on page and search
    const cacheKey = `emails:${page}:${search}`;
    const cachedData = emailCache.get(cacheKey);
    
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    const gmail = await getGmailClient(user.id);

    // Get messages list with partial data to reduce API calls
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: pageSize,
      q: search,
      pageToken: page > 1 ? await getPageToken(gmail, page, pageSize, search) : undefined,
    });

    const messages = response.data.messages || [];
    const totalEmails = response.data.resultSizeEstimate || 0;

    // Get message details in parallel to speed up fetching
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
        ...detail.data,
        labelIds: detail.data.labelIds || [],
      })),
      totalEmails,
      nextPageToken: response.data.nextPageToken || undefined,
    };

    // Cache the results
    emailCache.set(cacheKey, result);

    return NextResponse.json(result);
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Helper function to get the correct page token
async function getPageToken(
  gmail: gmail_v1.Gmail,
  targetPage: number,
  pageSize: number,
  search: string
) {
  const cacheKey = `pageToken:${targetPage}:${search}`;
  const cachedToken = emailCache.get(cacheKey);
  
  if (cachedToken) {
    return cachedToken as string;
  }

  let currentPage = 1;
  let currentToken: string | undefined = undefined;

  while (currentPage < targetPage) {
    const response: { data: gmail_v1.Schema$ListMessagesResponse } = await gmail.users.messages.list({
      userId: 'me',
      maxResults: pageSize,
      pageToken: currentToken,
      q: search,
    });

    currentToken = response.data.nextPageToken || undefined;
    if (!currentToken) break;
    
    // Cache each page token we discover
    emailCache.set(`pageToken:${currentPage + 1}:${search}`, currentToken);
    currentPage++;
  }

  return currentToken;
} 