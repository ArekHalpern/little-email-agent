import { emailCache } from '@/lib/cache';
import { getGmailClient } from '@/lib/db/actions';
import type { Email, EmailHeader } from '@/app/dashboard/types';
import type { gmail_v1 } from 'googleapis';

export async function initializeUserCache(userId: string) {
  try {
    await emailCache.initialize();
    const gmail = await getGmailClient(userId);
    
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 50,
    });

    if (!response.data.messages) return;

    await Promise.all(
      response.data.messages.map(async (message) => {
        const emailData = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'full',
        });

        // Transform Gmail message part to our Email type
        const email: Email = {
          id: emailData.data.id!,
          threadId: emailData.data.threadId!,
          snippet: emailData.data.snippet!,
          payload: {
            headers: (emailData.data.payload?.headers || []).map(header => ({
              name: header.name || '',
              value: header.value || ''
            })),
            parts: emailData.data.payload?.parts?.map(part => ({
              mimeType: part.mimeType || '',
              body: {
                data: part.body?.data || undefined
              }
            })),
            body: {
              data: emailData.data.payload?.body?.data || undefined
            }
          },
          internalDate: emailData.data.internalDate!,
        };

        await emailCache.set(`email:${email.id}`, { email });
      })
    );

    if (response.data.nextPageToken) {
      await emailCache.set('nextPageToken', { 
        nextPageToken: response.data.nextPageToken 
      });
    }

  } catch (error) {
    console.error('Failed to initialize cache:', error);
    throw error;
  }
} 