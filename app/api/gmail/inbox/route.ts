import { createClient } from '@/lib/auth/supabase/server'
import { NextResponse, NextRequest } from 'next/server'
import type { gmail_v1 } from 'googleapis'
import { getGmailClient } from '@/lib/db/actions'
import { emailCache } from '@/lib/cache'
import type { EmailCacheData } from '@/lib/cache'
import type { Email } from '@/app/dashboard/types'

// Create a separate cache for page tokens
const pageTokenCache = new Map<string, string>();

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

    // Add labelIds to only show inbox messages (exclude sent)
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: pageSize,
      q: search,
      labelIds: ['INBOX'],
      pageToken: page > 1 ? await getPageToken(gmail, page, pageSize, search) : undefined,
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
  const cachedToken = pageTokenCache.get(cacheKey);
  
  if (cachedToken) {
    return cachedToken;
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
    
    // Cache page tokens in separate cache
    pageTokenCache.set(`pageToken:${currentPage + 1}:${search}`, currentToken);
    currentPage++;
  }

  return currentToken;
} 